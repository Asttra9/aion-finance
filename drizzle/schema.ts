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
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow with role-based access control.
 * Two roles: consultor_aion (full access) and cliente (limited access to own data)
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
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
  cpfCnpj: varchar("cpfCnpj", { length: 20 }).unique(),
  businessType: mysqlEnum("businessType", ["pessoal", "mei", "profissional_liberal", "pj"]).notNull(),
  businessName: varchar("businessName", { length: 255 }),
  status: mysqlEnum("status", ["ativo", "inativo", "em_onboarding"]).default("ativo").notNull(),
  monthlyRevenue: decimal("monthlyRevenue", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

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
  reportType: mysqlEnum("reportType", ["fluxo_caixa", "dre", "completo"]).notNull(),
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
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
