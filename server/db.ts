import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

// ===== CLIENT QUERIES =====

export async function getClientsByConsultor(consultorId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(clients)
    .where(eq(clients.consultorId, consultorId));
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

export async function createTransaction(
  data: typeof transactions.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(transactions).values(data);
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
