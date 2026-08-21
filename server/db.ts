import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import {
  InsertUser,
  users,
  clients,
  transactions,
  accountsPayable,
  accountsReceivable,
  meiWorkflow,
  financialReports,
  fileUploads,
  notifications,
  transactionCategories,
  financialGoals,
  financialGoalContributions,
  serviceSubscriptions,
  recurringTransactions,
  recurringTransactionOccurrences,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildPortfolioMonthlyTrend } from "./portfolioTrend";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, input: { name: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");

  await db.update(users).set({ name: input.name }).where(eq(users.id, userId));
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  return result[0];
}

export async function provisionClientCredentials(input: { clientId: number; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");

  const client = await getClientById(input.clientId);
  if (!client) return undefined;
  if (!client.email) throw new Error("Cadastre um e-mail para liberar o acesso do cliente.");

  const now = new Date();
  let userId = client.userId;
  if (userId) {
    await db
      .update(users)
      .set({
        email: client.email.trim().toLowerCase(),
        name: client.name,
        passwordHash: input.passwordHash,
        passwordUpdatedAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
        role: "cliente",
        loginMethod: "senha_local",
      })
      .where(eq(users.id, userId));
  } else {
    const created = await db.insert(users).values({
      openId: `local-client-${client.id}-${randomUUID()}`,
      name: client.name,
      email: client.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      passwordUpdatedAt: now,
      failedLoginAttempts: 0,
      role: "cliente",
      loginMethod: "senha_local",
      lastSignedIn: now,
    });
    userId = Number(created[0].insertId);
    await db.update(clients).set({ userId }).where(eq(clients.id, client.id));
  }

  return { userId, email: client.email.trim().toLowerCase() };
}

export async function registerSuccessfulLocalLogin(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null, lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function registerFailedLocalLogin(userId: number, currentAttempts: number) {
  const db = await getDb();
  if (!db) return;
  const failedLoginAttempts = currentAttempts + 1;
  const lockedUntil = failedLoginAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
  await db.update(users).set({ failedLoginAttempts, lockedUntil }).where(eq(users.id, userId));
}

// ===== CLIENT QUERIES =====

export async function getClientsByConsultor(consultorId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(clients)
    .where(eq(clients.consultorId, consultorId));
}

export async function getConsultorPortfolioMetrics(consultorId: number) {
  const db = await getDb();
  if (!db) {
    return {
      totalClients: 0, activeClients: 0, onboardingClients: 0, recurringClients: 0,
      cancelledClients: 0, delinquentClients: 0, overdueBalance: 0,
      delinquentClientIds: [] as number[], projectedReceivables30: 0,
      projectedPayables30: 0, projectedNet30: 0, dueSoonCount: 0,
      dueSoonAmount: 0, monthlyTrend: [] as Array<{ period: string; income: number; expense: number; result: number }>,
    };
  }

  const portfolio = await db.select().from(clients).where(eq(clients.consultorId, consultorId));
  const clientIds = portfolio.map((client) => client.id);
  const base = {
    totalClients: portfolio.length,
    activeClients: portfolio.filter((client) => client.status === "ativo").length,
    onboardingClients: portfolio.filter((client) => client.status === "em_onboarding").length,
    recurringClients: portfolio.filter((client) => client.status === "ativo" && client.serviceModel === "recorrente").length,
    cancelledClients: portfolio.filter((client) => client.status === "inativo").length,
  };
  if (!clientIds.length) return {
    ...base, delinquentClients: 0, overdueBalance: 0, delinquentClientIds: [] as number[],
    projectedReceivables30: 0, projectedPayables30: 0, projectedNet30: 0,
    dueSoonCount: 0, dueSoonAmount: 0,
    monthlyTrend: [] as Array<{ period: string; income: number; expense: number; result: number }>,
  };

  const [payables, receivables, portfolioTransactions] = await Promise.all([
    db.select({ clientId: accountsPayable.clientId, status: accountsPayable.status, amount: accountsPayable.amount, dueDate: accountsPayable.dueDate }).from(accountsPayable).where(inArray(accountsPayable.clientId, clientIds)),
    db.select({ clientId: accountsReceivable.clientId, status: accountsReceivable.status, amount: accountsReceivable.amount, dueDate: accountsReceivable.dueDate }).from(accountsReceivable).where(inArray(accountsReceivable.clientId, clientIds)),
    db.select({ date: transactions.date, amount: transactions.amount, type: transactions.type }).from(transactions).where(inArray(transactions.clientId, clientIds)),
  ]);
  const overdueEntries = [...payables, ...receivables].filter((entry) => entry.status === "vencido");
  const delinquentClientIds = Array.from(new Set(overdueEntries.map((entry) => entry.clientId)));
  const overdueBalance = overdueEntries.reduce((total, entry) => total + Number(entry.amount || 0), 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next30Days = new Date(today);
  next30Days.setDate(next30Days.getDate() + 30);
  const next7Days = new Date(today);
  next7Days.setDate(next7Days.getDate() + 7);
  const isOpenWithin30Days = (entry: { status: string; dueDate: Date }) =>
    entry.status === "pendente" && entry.dueDate >= today && entry.dueDate <= next30Days;
  const projectedReceivables30 = receivables.filter(isOpenWithin30Days).reduce((total, entry) => total + Number(entry.amount || 0), 0);
  const projectedPayables30 = payables.filter(isOpenWithin30Days).reduce((total, entry) => total + Number(entry.amount || 0), 0);
  const dueSoonEntries = [...payables, ...receivables].filter((entry) => entry.status === "pendente" && entry.dueDate >= today && entry.dueDate <= next7Days);
  const monthlyTrend = buildPortfolioMonthlyTrend(portfolioTransactions, today);

  return {
    ...base, delinquentClients: delinquentClientIds.length, overdueBalance, delinquentClientIds,
    projectedReceivables30, projectedPayables30, projectedNet30: projectedReceivables30 - projectedPayables30,
    dueSoonCount: dueSoonEntries.length,
    dueSoonAmount: dueSoonEntries.reduce((total, entry) => total + Number(entry.amount || 0), 0),
    monthlyTrend,
  };
}

export async function getServiceSubscriptionsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(serviceSubscriptions)
    .where(eq(serviceSubscriptions.clientId, clientId))
    .orderBy(serviceSubscriptions.billingDay);
}

export async function createServiceSubscription(data: typeof serviceSubscriptions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(serviceSubscriptions).values(data);
}

export async function getClientById(clientId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getClientByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createClient(data: typeof clients.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(clients).values(data);
  return result;
}

export async function updateClient(
  clientId: number,
  data: Partial<typeof clients.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(clients).set(data).where(eq(clients.id, clientId));
}

// ===== TRANSACTION QUERIES =====

export async function getTransactionsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(transactions)
    .where(eq(transactions.clientId, clientId))
    .orderBy(desc(transactions.date));
}

export async function getRecentTransactionsByClient(clientId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(transactions)
    .where(eq(transactions.clientId, clientId))
    .orderBy(desc(transactions.date))
    .limit(Math.min(Math.max(limit, 1), 500));
}

export async function getExistingTransactionOfxIds(clientId: number, ofxIds: string[]) {
  const db = await getDb();
  if (!db || ofxIds.length === 0) return new Set<string>();

  const existing = new Set<string>();
  const uniqueIds = Array.from(new Set(ofxIds));
  for (let index = 0; index < uniqueIds.length; index += 500) {
    const batch = uniqueIds.slice(index, index + 500);
    const rows = await db
      .select({ ofxId: transactions.ofxId })
      .from(transactions)
      .where(and(eq(transactions.clientId, clientId), inArray(transactions.ofxId, batch)));
    rows.forEach((row) => {
      if (row.ofxId) existing.add(row.ofxId);
    });
  }
  return existing;
}

export async function createTransaction(
  data: typeof transactions.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(transactions).values(data);
}

export async function createTransactions(data: Array<typeof transactions.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (let index = 0; index < data.length; index += 500) {
    await db.insert(transactions).values(data.slice(index, index + 500));
  }
}

// ===== RECORRÊNCIAS E PREVISÕES =====

export async function getRecurringTransactionsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(recurringTransactions)
    .where(eq(recurringTransactions.clientId, clientId))
    .orderBy(desc(recurringTransactions.nextOccurrence));
}

export async function getRecurringTransactionById(recurringTransactionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(recurringTransactions)
    .where(eq(recurringTransactions.id, recurringTransactionId))
    .limit(1);
  return result[0];
}

export async function createRecurringTransaction(data: typeof recurringTransactions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(recurringTransactions).values(data);
}

export async function updateRecurringTransaction(
  recurringTransactionId: number,
  data: Partial<typeof recurringTransactions.$inferInsert>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(recurringTransactions).set(data).where(eq(recurringTransactions.id, recurringTransactionId));
}

function clampRecurringDay(year: number, monthIndex: number, day: number) {
  return Math.min(Math.max(day, 1), new Date(year, monthIndex + 1, 0).getDate());
}

function nextRecurringDate(rule: typeof recurringTransactions.$inferSelect, reference: Date) {
  const current = new Date(reference);
  if (rule.frequency === "anual") {
    const targetMonth = Math.min(Math.max(rule.dueMonth ?? current.getMonth() + 1, 1), 12) - 1;
    const scheduled = new Date(current.getFullYear(), targetMonth, clampRecurringDay(current.getFullYear(), targetMonth, rule.dueDay));
    if (scheduled <= current) {
      const year = current.getFullYear() + 1;
      return new Date(year, targetMonth, clampRecurringDay(year, targetMonth, rule.dueDay));
    }
    return scheduled;
  }

  const scheduled = new Date(current.getFullYear(), current.getMonth(), clampRecurringDay(current.getFullYear(), current.getMonth(), rule.dueDay));
  if (scheduled <= current) {
    const nextMonth = current.getMonth() + 1;
    return new Date(current.getFullYear(), nextMonth, clampRecurringDay(current.getFullYear(), nextMonth, rule.dueDay));
  }
  return scheduled;
}

/** Geração por demanda, sem timers, com uma única previsão por competência. */
export async function ensureRecurringOccurrencesForClient(clientId: number, daysAhead = 60) {
  const db = await getDb();
  if (!db) return 0;
  const rules = await db
    .select()
    .from(recurringTransactions)
    .where(and(eq(recurringTransactions.clientId, clientId), eq(recurringTransactions.status, "ativa")));
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + daysAhead);
  let created = 0;

  for (const rule of rules) {
    let scheduledDate = new Date(rule.nextOccurrence);
    while (scheduledDate <= horizon) {
      const existing = await db
        .select({ id: recurringTransactionOccurrences.id })
        .from(recurringTransactionOccurrences)
        .where(and(
          eq(recurringTransactionOccurrences.recurringTransactionId, rule.id),
          eq(recurringTransactionOccurrences.scheduledDate, scheduledDate),
        ))
        .limit(1);
      if (!existing[0]) {
        await db.insert(recurringTransactionOccurrences).values({
          recurringTransactionId: rule.id,
          clientId,
          scheduledDate,
          status: "previsto",
        });
        created++;
      }
      scheduledDate = nextRecurringDate(rule, scheduledDate);
    }
    if (scheduledDate.getTime() !== new Date(rule.nextOccurrence).getTime()) {
      await db.update(recurringTransactions).set({ nextOccurrence: scheduledDate }).where(eq(recurringTransactions.id, rule.id));
    }
  }
  return created;
}

export async function getRecurringOccurrencesByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ occurrence: recurringTransactionOccurrences, rule: recurringTransactions })
    .from(recurringTransactionOccurrences)
    .innerJoin(recurringTransactions, eq(recurringTransactionOccurrences.recurringTransactionId, recurringTransactions.id))
    .where(eq(recurringTransactionOccurrences.clientId, clientId))
    .orderBy(desc(recurringTransactionOccurrences.scheduledDate));
}

export async function getRecurringOccurrenceById(occurrenceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ occurrence: recurringTransactionOccurrences, rule: recurringTransactions })
    .from(recurringTransactionOccurrences)
    .innerJoin(recurringTransactions, eq(recurringTransactionOccurrences.recurringTransactionId, recurringTransactions.id))
    .where(eq(recurringTransactionOccurrences.id, occurrenceId))
    .limit(1);
  return result[0];
}

export async function confirmRecurringOccurrence(occurrenceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const item = await getRecurringOccurrenceById(occurrenceId);
  if (!item) throw new Error("Recurring occurrence not found");
  if (item.occurrence.status === "confirmado" || item.occurrence.transactionId) throw new Error("Recurring occurrence already confirmed");

  const result = await db.insert(transactions).values({
    clientId: item.occurrence.clientId,
    categoryId: item.rule.categoryId,
    date: item.occurrence.scheduledDate,
    description: item.rule.description,
    amount: item.rule.amount,
    type: item.rule.type,
    financeType: item.rule.financeType,
    status: "pendente",
    notes: "Lançamento confirmado a partir de recorrência.",
  });
  const transactionId = Number((result as unknown as [{ insertId?: number }])[0]?.insertId);
  if (!Number.isInteger(transactionId) || transactionId <= 0) throw new Error("Unable to create confirmed transaction");

  await db.update(recurringTransactionOccurrences).set({ status: "confirmado", transactionId }).where(eq(recurringTransactionOccurrences.id, occurrenceId));
  return { transactionId };
}

export async function updateRecurringOccurrenceStatus(occurrenceId: number, status: "adiado" | "cancelado") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(recurringTransactionOccurrences).set({ status }).where(eq(recurringTransactionOccurrences.id, occurrenceId));
}

export async function getTransactionCategories(consultorId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(transactionCategories)
    .where(eq(transactionCategories.consultorId, consultorId));
}

export async function createTransactionCategory(
  data: typeof transactionCategories.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(transactionCategories).values(data);
}

export async function getTransactionCategoryById(categoryId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [category] = await db.select().from(transactionCategories).where(eq(transactionCategories.id, categoryId));
  return category;
}

export async function updateTransactionCategory(
  categoryId: number,
  data: Partial<typeof transactionCategories.$inferInsert>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(transactionCategories).set(data).where(eq(transactionCategories.id, categoryId));
}

// ===== ACCOUNTS PAYABLE QUERIES =====

export async function getAccountsPayableByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(accountsPayable)
    .where(eq(accountsPayable.clientId, clientId))
    .orderBy(desc(accountsPayable.dueDate));
}

export async function createAccountPayable(
  data: typeof accountsPayable.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(accountsPayable).values(data);
}

export async function updateAccountPayable(
  apId: number,
  data: Partial<typeof accountsPayable.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(accountsPayable).set(data).where(eq(accountsPayable.id, apId));
}

// ===== ACCOUNTS RECEIVABLE QUERIES =====

export async function getAccountsReceivableByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(accountsReceivable)
    .where(eq(accountsReceivable.clientId, clientId))
    .orderBy(desc(accountsReceivable.dueDate));
}

export async function createAccountReceivable(
  data: typeof accountsReceivable.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(accountsReceivable).values(data);
}

export async function updateAccountReceivable(
  arId: number,
  data: Partial<typeof accountsReceivable.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(accountsReceivable)
    .set(data)
    .where(eq(accountsReceivable.id, arId));
}

// ===== FINANCIAL GOALS QUERIES =====

export async function getFinancialGoalsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financialGoals).where(eq(financialGoals.clientId, clientId)).orderBy(desc(financialGoals.createdAt));
}

export async function getFinancialGoalById(goalId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(financialGoals).where(eq(financialGoals.id, goalId)).limit(1);
  return result[0];
}

export async function createFinancialGoal(data: typeof financialGoals.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(financialGoals).values(data);
}

export async function updateFinancialGoal(goalId: number, data: Partial<typeof financialGoals.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(financialGoals).set(data).where(eq(financialGoals.id, goalId));
}

export async function deleteFinancialGoal(goalId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(financialGoals).where(eq(financialGoals.id, goalId));
}

export async function createFinancialGoalContribution(data: typeof financialGoalContributions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(financialGoalContributions).values(data);
}

export async function getFinancialGoalContributionsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: financialGoalContributions.id,
      goalId: financialGoalContributions.goalId,
      clientId: financialGoalContributions.clientId,
      goalName: financialGoals.name,
      goalColor: financialGoals.color,
      amount: financialGoalContributions.amount,
      note: financialGoalContributions.note,
      month: financialGoalContributions.month,
      createdAt: financialGoalContributions.createdAt,
    })
    .from(financialGoalContributions)
    .innerJoin(financialGoals, eq(financialGoalContributions.goalId, financialGoals.id))
    .where(eq(financialGoalContributions.clientId, clientId))
    .orderBy(desc(financialGoalContributions.createdAt));
}

export async function getFinancialGoalContributionsByGoal(goalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(financialGoalContributions)
    .where(eq(financialGoalContributions.goalId, goalId))
    .orderBy(desc(financialGoalContributions.createdAt));
}

// ===== MEI WORKFLOW QUERIES =====

export async function getMeiWorkflowByClient(clientId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(meiWorkflow)
    .where(eq(meiWorkflow.clientId, clientId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createMeiWorkflow(
  data: typeof meiWorkflow.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(meiWorkflow).values(data);
}

export async function updateMeiWorkflow(
  clientId: number,
  data: Partial<typeof meiWorkflow.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(meiWorkflow)
    .set(data)
    .where(eq(meiWorkflow.clientId, clientId));
}

// ===== FINANCIAL REPORTS QUERIES =====

export async function getFinancialReportsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(financialReports)
    .where(eq(financialReports.clientId, clientId))
    .orderBy(desc(financialReports.month));
}

export async function createFinancialReport(
  data: typeof financialReports.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(financialReports).values(data);
}

// ===== FILE UPLOADS QUERIES =====

export async function getFileUploadsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(fileUploads)
    .where(eq(fileUploads.clientId, clientId))
    .orderBy(desc(fileUploads.createdAt));
}

export async function createFileUpload(
  data: typeof fileUploads.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(fileUploads).values(data);
}

// ===== NOTIFICATIONS QUERIES =====

export async function getNotificationsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(notifications)
    .where(eq(notifications.clientId, clientId))
    .orderBy(desc(notifications.createdAt));
}

export async function createNotification(
  data: typeof notifications.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(notifications).values(data);
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, notificationId));
}

export async function resolveNotification(notificationId: number, resolutionNote?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(notifications)
    .set({ read: true, resolvedAt: new Date(), resolutionNote })
    .where(eq(notifications.id, notificationId));
}


export async function getTransactionByOfxId(clientId: number, ofxId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.clientId, clientId), eq(transactions.ofxId, ofxId)))
    .limit(1);
  return result[0];
}

export async function updateTransaction(
  transactionId: number,
  data: Partial<typeof transactions.$inferInsert>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(transactions).set(data).where(eq(transactions.id, transactionId));
}

export async function reconcilePendingTransactionsByClient(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const pending = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.clientId, clientId), eq(transactions.status, "pendente")));
  if (!pending.length) return { reconciled: 0 };
  await db
    .update(transactions)
    .set({ status: "conciliado" })
    .where(and(eq(transactions.clientId, clientId), eq(transactions.status, "pendente")));
  return { reconciled: pending.length };
}

export async function deleteTransaction(transactionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(transactions).where(eq(transactions.id, transactionId));
}

export async function getTransactionById(transactionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);
  return result[0];
}

export async function getAccountPayableById(apId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accountsPayable).where(eq(accountsPayable.id, apId)).limit(1);
  return result[0];
}

export async function getAccountReceivableById(arId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accountsReceivable).where(eq(accountsReceivable.id, arId)).limit(1);
  return result[0];
}

export async function getNotificationById(notificationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(notifications).where(eq(notifications.id, notificationId)).limit(1);
  return result[0];
}

export async function deleteAccountPayable(apId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(accountsPayable).where(eq(accountsPayable.id, apId));
}

export async function deleteAccountReceivable(arId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(accountsReceivable).where(eq(accountsReceivable.id, arId));
}

export async function getReportById(reportId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(financialReports).where(eq(financialReports.id, reportId)).limit(1);
  return result[0];
}

// ===== REPORTS =====

export async function getReportsByClient(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(financialReports)
    .where(eq(financialReports.clientId, clientId));
}

export async function createReport(
  data: typeof financialReports.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(financialReports).values(data);
}
