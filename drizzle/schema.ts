import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow with role-based access control.
 * Two roles: consultor_aion (full access) and cliente (limited access to own data)
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  passwordUpdatedAt: timestamp("passwordUpdatedAt"),
  failedLoginAttempts: int("failedLoginAttempts").default(0).notNull(),
  lockedUntil: timestamp("lockedUntil"),
  role: mysqlEnum("role", ["consultor_aion", "cliente", "admin", "user"]).default("cliente").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Clientes table - MEIs and freelancers managed by consultants
 * Each client is linked to a consultant (consultor_aion user)
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  consultorId: int("consultorId").notNull(), // References users.id (consultor_aion)
  userId: int("userId"), // References users.id (cliente) - optional, for client portal access
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  cpfCnpj: varchar("cpfCnpj", { length: 20 }).unique(),
  businessType: mysqlEnum("businessType", ["pessoal", "mei", "profissional_liberal", "pj"]).notNull(),
  businessName: varchar("businessName", { length: 255 }),
  status: mysqlEnum("status", ["ativo", "inativo", "em_onboarding"]).default("ativo").notNull(),
  serviceModel: mysqlEnum("serviceModel", ["recorrente", "pontual"]),
  monthlyRevenue: decimal("monthlyRevenue", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Convites de ativação são emitidos exclusivamente pelo consultor responsável.
 * O token bruto nunca é persistido: somente seu hash é usado para validação.
 */
export const accountInvites = mysqlTable(
  "account_invites",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("clientId").notNull(),
    consultorId: int("consultorId").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["pendente", "aceito", "revogado", "expirado"]).default("pendente").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedAt: timestamp("acceptedAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("account_invites_token_hash_unique").on(table.tokenHash)],
);

export type AccountInvite = typeof accountInvites.$inferSelect;
export type InsertAccountInvite = typeof accountInvites.$inferInsert;

/**
 * Perfil mínimo coletado no primeiro acesso. Não representa lançamentos ou
 * diagnóstico financeiro completo e permanece separado do cadastro central.
 */
export const clientOnboardingProfiles = mysqlTable(
  "client_onboarding_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("clientId").notNull(),
    profileType: mysqlEnum("profileType", ["pessoal", "empresarial"]).notNull(),
    personalGoal: varchar("personalGoal", { length: 120 }),
    incomeRange: varchar("incomeRange", { length: 80 }),
    legalName: varchar("legalName", { length: 255 }),
    segment: varchar("segment", { length: 120 }),
    revenueRange: varchar("revenueRange", { length: 80 }),
    financialControlMethod: varchar("financialControlMethod", { length: 120 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("client_onboarding_profiles_client_unique").on(table.clientId)],
);

export type ClientOnboardingProfile = typeof clientOnboardingProfiles.$inferSelect;
export type InsertClientOnboardingProfile = typeof clientOnboardingProfiles.$inferInsert;

/**
 * Solicitações públicas de acesso analisadas na fila Aion — Moderação.
 * Permanecem separadas da carteira até uma aprovação explícita do consultor
 * escolhido; a senha é preservada somente em forma de hash.
 */
export const accountAccessRequests = mysqlTable(
  "account_access_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    consultorId: int("consultorId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    pendingEmail: varchar("pendingEmail", { length: 320 }),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    businessType: mysqlEnum("businessType", ["pessoal", "mei"]).notNull(),
    status: mysqlEnum("status", ["pendente", "aprovada", "recusada"]).default("pendente").notNull(),
    decidedAt: timestamp("decidedAt"),
    decidedBy: int("decidedBy"),
    createdUserId: int("createdUserId"),
    createdClientId: int("createdClientId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("account_access_requests_pending_email_unique").on(table.pendingEmail)],
);

export type AccountAccessRequest = typeof accountAccessRequests.$inferSelect;
export type InsertAccountAccessRequest = typeof accountAccessRequests.$inferInsert;

/**
 * Transaction categories for OFX import and reconciliation
 */
export const transactionCategories = mysqlTable("transaction_categories", {
  id: int("id").autoincrement().primaryKey(),
  consultorId: int("consultorId").notNull(), // Each consultant can have custom categories
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["receita", "despesa"]).notNull(),
  color: varchar("color", { length: 7 }), // Hex color for UI
  isDefault: boolean("isDefault").default(false),
  isFixedCost: boolean("isFixedCost").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TransactionCategory = typeof transactionCategories.$inferSelect;
export type InsertTransactionCategory = typeof transactionCategories.$inferInsert;

/**
 * Transactions imported from OFX or manually entered
 * Supports both personal and business finance tracking
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(), // References clients.id
  categoryId: int("categoryId"), // References transaction_categories.id
  date: timestamp("date").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["receita", "despesa"]).notNull(),
  financeType: mysqlEnum("financeType", ["pessoal", "empresarial"]).default("empresarial").notNull(),
  status: mysqlEnum("status", ["pendente", "conciliado", "cancelado"]).default("pendente").notNull(),
  ofxId: varchar("ofxId", { length: 255 }), // ID from OFX for deduplication
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Accounts Payable - bills and expenses to be paid
 */
export const accountsPayable = mysqlTable("accounts_payable", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("dueDate").notNull(),
  paymentDate: timestamp("paymentDate"),
  status: mysqlEnum("status", ["pendente", "pago", "vencido", "cancelado"]).default("pendente").notNull(),
  vendor: varchar("vendor", { length: 255 }),
  category: varchar("category", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountPayable = typeof accountsPayable.$inferSelect;
export type InsertAccountPayable = typeof accountsPayable.$inferInsert;

/**
 * Accounts Receivable - invoices and income to be received
 */
export const accountsReceivable = mysqlTable("accounts_receivable", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("dueDate").notNull(),
  paymentDate: timestamp("paymentDate"),
  status: mysqlEnum("status", ["pendente", "pago", "vencido", "cancelado"]).default("pendente").notNull(),
  customer: varchar("customer", { length: 255 }),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountReceivable = typeof accountsReceivable.$inferSelect;
export type InsertAccountReceivable = typeof accountsReceivable.$inferInsert;

/**
 * Assinaturas de serviços acompanhadas na jornada pessoal. São cadastradas
 * explicitamente para não deduzir recorrência a partir de descrições bancárias.
 */
export const serviceSubscriptions = mysqlTable("service_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  name: varchar("name", { length: 140 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  billingDay: int("billingDay").notNull(),
  status: mysqlEnum("status", ["ativa", "pausada", "cancelada"]).default("ativa").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServiceSubscription = typeof serviceSubscriptions.$inferSelect;
export type InsertServiceSubscription = typeof serviceSubscriptions.$inferInsert;

/**
 * Regras para compromissos mensais ou anuais. A regra nunca representa um
 * movimento efetivo; ela apenas gera previsões que devem ser confirmadas.
 */
export const recurringTransactions = mysqlTable("recurring_transactions", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  categoryId: int("categoryId"),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["receita", "despesa"]).notNull(),
  financeType: mysqlEnum("financeType", ["pessoal", "empresarial"]).default("empresarial").notNull(),
  frequency: mysqlEnum("frequency", ["mensal", "anual"]).notNull(),
  dueDay: int("dueDay").notNull(),
  dueMonth: int("dueMonth"),
  status: mysqlEnum("status", ["ativa", "suspensa"]).default("ativa").notNull(),
  nextOccurrence: timestamp("nextOccurrence").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type InsertRecurringTransaction = typeof recurringTransactions.$inferInsert;

/**
 * Instâncias previstas por competência. O índice composto protege a geração
 * idempotente e o vínculo opcional evita duplicar a transação confirmada.
 */
export const recurringTransactionOccurrences = mysqlTable(
  "recurring_transaction_occurrences",
  {
    id: int("id").autoincrement().primaryKey(),
    recurringTransactionId: int("recurringTransactionId").notNull(),
    clientId: int("clientId").notNull(),
    scheduledDate: timestamp("scheduledDate").notNull(),
    status: mysqlEnum("status", ["previsto", "confirmado", "adiado", "cancelado"]).default("previsto").notNull(),
    transactionId: int("transactionId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("recurring_occurrence_competency_unique").on(table.recurringTransactionId, table.scheduledDate)],
);

export type RecurringTransactionOccurrence = typeof recurringTransactionOccurrences.$inferSelect;
export type InsertRecurringTransactionOccurrence = typeof recurringTransactionOccurrences.$inferInsert;

/**
 * Financial goals ("caixinhas") for personal and business financial planning.
 */
export const financialGoals = mysqlTable("financial_goals", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  name: varchar("name", { length: 140 }).notNull(),
  targetAmount: decimal("targetAmount", { precision: 12, scale: 2 }).notNull(),
  savedAmount: decimal("savedAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  dueDate: timestamp("dueDate"),
  color: varchar("color", { length: 7 }).default("#b21d31").notNull(),
  icon: varchar("icon", { length: 32 }).default("wallet").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FinancialGoal = typeof financialGoals.$inferSelect;
export type InsertFinancialGoal = typeof financialGoals.$inferInsert;

/**
 * Individual contributions to financial goals. The denormalized month enables
 * quick monthly views without inferring financial periods from the UI.
 */
export const financialGoalContributions = mysqlTable("financial_goal_contributions", {
  id: int("id").autoincrement().primaryKey(),
  goalId: int("goalId").notNull(),
  clientId: int("clientId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  note: varchar("note", { length: 280 }),
  month: varchar("month", { length: 7 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FinancialGoalContribution = typeof financialGoalContributions.$inferSelect;
export type InsertFinancialGoalContribution = typeof financialGoalContributions.$inferInsert;

/**
 * MEI Opening Workflow - tracks the process of opening a MEI
 */
export const meiWorkflow = mysqlTable("mei_workflow", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().unique(),
  status: mysqlEnum("status", ["nao_iniciado", "em_progresso", "concluido", "cancelado"]).default("nao_iniciado").notNull(),
  steps: json("steps").$type<{
    step: string;
    completed: boolean;
    completedAt?: string;
  }[]>().default([]),
  documents: json("documents").$type<{
    name: string;
    uploaded: boolean;
    uploadedAt?: string;
    fileKey?: string;
  }[]>().default([]),
  ccmeiDate: timestamp("ccmeiDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MeiWorkflow = typeof meiWorkflow.$inferSelect;
export type InsertMeiWorkflow = typeof meiWorkflow.$inferInsert;

/**
 * Financial Reports - generated monthly reports for clients
 */
export const financialReports = mysqlTable("financial_reports", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  month: timestamp("month").notNull(), // First day of the month
  reportType: mysqlEnum("reportType", ["fluxo_caixa", "dre", "completo", "resumo_pessoal"]).notNull(),
  fileKey: varchar("fileKey", { length: 255 }), // S3 key for the PDF
  fileUrl: text("fileUrl"), // Presigned URL for download
  summary: json("summary").$type<{
    totalIncome?: number;
    totalExpense?: number;
    netCashFlow?: number;
    grossMargin?: number;
    breakEvenPoint?: number;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // When presigned URL expires
});

export type FinancialReport = typeof financialReports.$inferSelect;
export type InsertFinancialReport = typeof financialReports.$inferInsert;

/**
 * File uploads - OFX extracts and other documents
 */
export const fileUploads = mysqlTable("file_uploads", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: mysqlEnum("fileType", ["ofx", "pdf", "csv", "outro"]).notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(), // S3 key
  fileSize: int("fileSize"),
  uploadedBy: int("uploadedBy").notNull(), // References users.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FileUpload = typeof fileUploads.$inferSelect;
export type InsertFileUpload = typeof fileUploads.$inferInsert;

/**
 * Notifications and reminders for collection automation
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  type: mysqlEnum("type", ["vencimento_proximo", "vencido", "lembrete_cobranca"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  relatedId: int("relatedId"), // ID of related AP/AR
  relatedType: mysqlEnum("relatedType", ["accounts_payable", "accounts_receivable"]),
  read: boolean("read").default(false),
  resolvedAt: timestamp("resolvedAt"),
  resolutionNote: varchar("resolutionNote", { length: 280 }),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
