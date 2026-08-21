import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { parseOFX, isValidOFX } from "./ofxParser";
import { storagePut } from "./storage";
import { buildFinancialReportPdf } from "./reportPdf";
import { filterEntriesByMonth } from "./financialCalculations";

const consultorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "consultor_aion" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso exclusivo do Consultor Aion." });
  }
  return next({ ctx });
});

function isConsultor(role: string) {
  return role === "consultor_aion" || role === "admin";
}

async function requireClientAccess(clientId: number, ctx: { user: NonNullable<import("./_core/context").TrpcContext["user"]> }) {
  const client = await db.getClientById(clientId);
  if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
  if (!isConsultor(ctx.user.role) && client.userId !== ctx.user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode acessar os próprios dados." });
  }
  return client;
}

const money = z.string().refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, "Informe um valor financeiro válido.");
const workflowStep = z.object({ step: z.string(), completed: z.boolean(), completedAt: z.string().optional() });
const workflowDocument = z.object({ name: z.string(), uploaded: z.boolean(), uploadedAt: z.string().optional(), fileKey: z.string().optional() });

const defaultSteps = [
  "Definir atividade e dados do MEI",
  "Validar documentos do titular",
  "Solicitar viabilidade e inscrição",
  "Preencher cadastro no Portal do Empreendedor",
  "Emitir CCMEI",
  "Orientar emissão de notas",
  "Configurar rotina financeira",
  "Entregar documentação ao cliente",
];
const defaultDocuments = ["Documento de identificação", "Comprovante de endereço", "Título de eleitor ou recibo do IRPF", "Dados de contato e atividade"];

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  clients: router({
    list: consultorProcedure.query(({ ctx }) => db.getClientsByConsultor(ctx.user.id)),
    get: protectedProcedure.input(z.object({ clientId: z.number() })).query(({ input, ctx }) => requireClientAccess(input.clientId, ctx)),
    me: protectedProcedure.query(({ ctx }) => db.getClientByUserId(ctx.user.id)),
    create: consultorProcedure.input(z.object({
      name: z.string().min(2), email: z.string().email().optional(), phone: z.string().optional(), cpfCnpj: z.string().optional(),
      businessType: z.enum(["pessoal", "mei", "profissional_liberal", "pj"]), businessName: z.string().optional(), monthlyRevenue: money.optional(), notes: z.string().optional(),
    })).mutation(({ input, ctx }) => db.createClient({ ...input, consultorId: ctx.user.id, monthlyRevenue: input.monthlyRevenue ? Number(input.monthlyRevenue) as any : undefined })),
    update: consultorProcedure.input(z.object({
      clientId: z.number(), name: z.string().min(2).optional(), email: z.string().email().optional(), phone: z.string().optional(), businessName: z.string().optional(), monthlyRevenue: money.optional(), notes: z.string().optional(), status: z.enum(["ativo", "inativo", "em_onboarding"]).optional(),
    })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.updateClient(input.clientId, { name: input.name, email: input.email, phone: input.phone, businessName: input.businessName, monthlyRevenue: input.monthlyRevenue ? Number(input.monthlyRevenue) as any : undefined, notes: input.notes, status: input.status });
    }),
  }),

  financialGoals: router({
    list: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => {
      await requireClientAccess(input.clientId, ctx);
      return db.getFinancialGoalsByClient(input.clientId);
    }),
    contributions: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => {
      await requireClientAccess(input.clientId, ctx);
      return db.getFinancialGoalContributionsByClient(input.clientId);
    }),
    create: protectedProcedure.input(z.object({
      clientId: z.number(),
      name: z.string().min(2).max(140),
      targetAmount: money,
      savedAmount: money.optional(),
      dueDate: z.date().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      icon: z.string().max(32).optional(),
    })).mutation(async ({ input, ctx }) => {
      await requireClientAccess(input.clientId, ctx);
      return db.createFinancialGoal({
        clientId: input.clientId,
        name: input.name,
        targetAmount: Number(input.targetAmount) as any,
        savedAmount: Number(input.savedAmount ?? "0") as any,
        dueDate: input.dueDate,
        color: input.color,
        icon: input.icon,
      });
    }),
    contribute: protectedProcedure.input(z.object({ goalId: z.number(), amount: money, note: z.string().trim().max(280).optional() })).mutation(async ({ input, ctx }) => {
      const goal = await db.getFinancialGoalById(input.goalId);
      if (!goal) throw new TRPCError({ code: "NOT_FOUND", message: "Meta não encontrada." });
      await requireClientAccess(goal.clientId, ctx);
      const nextAmount = Number(goal.savedAmount) + Number(input.amount);
      const contribution = {
        goalId: goal.id,
        clientId: goal.clientId,
        amount: Number(input.amount) as any,
        note: input.note || undefined,
        month: new Date().toISOString().slice(0, 7),
      };
      await db.createFinancialGoalContribution(contribution);
      return db.updateFinancialGoal(goal.id, { savedAmount: nextAmount as any });
    }),
    update: protectedProcedure.input(z.object({
      goalId: z.number(), name: z.string().min(2).max(140).optional(), targetAmount: money.optional(), dueDate: z.date().nullable().optional(), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), icon: z.string().max(32).optional(),
    })).mutation(async ({ input, ctx }) => {
      const goal = await db.getFinancialGoalById(input.goalId);
      if (!goal) throw new TRPCError({ code: "NOT_FOUND" });
      await requireClientAccess(goal.clientId, ctx);
      return db.updateFinancialGoal(goal.id, { name: input.name, targetAmount: input.targetAmount ? Number(input.targetAmount) as any : undefined, dueDate: input.dueDate, color: input.color, icon: input.icon });
    }),
    delete: protectedProcedure.input(z.object({ goalId: z.number() })).mutation(async ({ input, ctx }) => {
      const goal = await db.getFinancialGoalById(input.goalId);
      if (!goal) throw new TRPCError({ code: "NOT_FOUND" });
      await requireClientAccess(goal.clientId, ctx);
      return db.deleteFinancialGoal(goal.id);
    }),
  }),

  transactions: router({
    list: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => { await requireClientAccess(input.clientId, ctx); return db.getTransactionsByClient(input.clientId); }),
    categories: consultorProcedure.query(({ ctx }) => db.getTransactionCategories(ctx.user.id)),
    categoriesForClient: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => {
      const client = await requireClientAccess(input.clientId, ctx);
      return db.getTransactionCategories(client.consultorId);
    }),
    createCategory: consultorProcedure.input(z.object({ name: z.string().min(2), type: z.enum(["receita", "despesa"]), color: z.string().optional() })).mutation(({ input, ctx }) => db.createTransactionCategory({ ...input, consultorId: ctx.user.id })),
    create: consultorProcedure.input(z.object({ clientId: z.number(), categoryId: z.number().optional(), date: z.date(), description: z.string().min(2), amount: money, type: z.enum(["receita", "despesa"]), financeType: z.enum(["pessoal", "empresarial"]).default("empresarial"), notes: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.createTransaction({ ...input, amount: Number(input.amount) as any });
    }),
    importOfx: consultorProcedure.input(z.object({ clientId: z.number(), fileName: z.string().min(1), content: z.string().min(20).max(5_000_000), financeType: z.enum(["pessoal", "empresarial"]).default("empresarial"), categoryId: z.number().optional() })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (!isValidOFX(input.content)) throw new TRPCError({ code: "BAD_REQUEST", message: "Arquivo OFX inválido ou incompleto." });
      const parsed = parseOFX(input.content);
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const stored = await storagePut(`clients/${input.clientId}/ofx/${safeName}`, Buffer.from(input.content, "utf8"), "application/x-ofx");
      await db.createFileUpload({ clientId: input.clientId, fileName: input.fileName, fileType: "ofx", fileKey: stored.key, fileSize: Buffer.byteLength(input.content), uploadedBy: ctx.user.id });
      let imported = 0;
      let skipped = 0;
      for (const transaction of parsed.transactions) {
        const duplicate = await db.getTransactionByOfxId(input.clientId, transaction.ofxId);
        if (duplicate) { skipped++; continue; }
        await db.createTransaction({ clientId: input.clientId, categoryId: input.categoryId, date: transaction.date, description: transaction.description, amount: transaction.amount as any, type: transaction.type, financeType: input.financeType, status: "pendente", ofxId: transaction.ofxId });
        imported++;
      }
      return { imported, skipped, errors: parsed.errors, fileKey: stored.key, accountNumber: parsed.accountNumber, bankCode: parsed.bankCode };
    }),
    update: consultorProcedure.input(z.object({ transactionId: z.number(), categoryId: z.number().nullable().optional(), financeType: z.enum(["pessoal", "empresarial"]).optional(), notes: z.string().optional(), description: z.string().min(2).optional() })).mutation(async ({ input, ctx }) => {
      const transaction = await db.getTransactionById(input.transactionId);
      if (!transaction) throw new TRPCError({ code: "NOT_FOUND" });
      const client = await db.getClientById(transaction.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.updateTransaction(input.transactionId, { categoryId: input.categoryId, financeType: input.financeType, notes: input.notes, description: input.description });
    }),
    reconcile: consultorProcedure.input(z.object({ transactionId: z.number(), categoryId: z.number().nullable().optional(), financeType: z.enum(["pessoal", "empresarial"]).optional() })).mutation(async ({ input, ctx }) => {
      const transaction = await db.getTransactionById(input.transactionId);
      if (!transaction) throw new TRPCError({ code: "NOT_FOUND" });
      const client = await db.getClientById(transaction.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.updateTransaction(input.transactionId, { status: "conciliado", categoryId: input.categoryId, financeType: input.financeType });
    }),
    delete: consultorProcedure.input(z.object({ transactionId: z.number() })).mutation(async ({ input, ctx }) => {
      const transaction = await db.getTransactionById(input.transactionId);
      if (!transaction) throw new TRPCError({ code: "NOT_FOUND" });
      const client = await db.getClientById(transaction.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.deleteTransaction(input.transactionId);
    }),
  }),

  accountsPayable: router({
    list: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => { await requireClientAccess(input.clientId, ctx); return db.getAccountsPayableByClient(input.clientId); }),
    create: consultorProcedure.input(z.object({ clientId: z.number(), description: z.string().min(2), amount: money, dueDate: z.date(), vendor: z.string().optional(), category: z.string().optional(), notes: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId); if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.createAccountPayable({ ...input, amount: Number(input.amount) as any });
    }),
    update: consultorProcedure.input(z.object({ apId: z.number(), description: z.string().min(2).optional(), amount: money.optional(), dueDate: z.date().optional(), vendor: z.string().optional(), category: z.string().optional(), notes: z.string().optional(), status: z.enum(["pendente", "pago", "vencido", "cancelado"]).optional() })).mutation(async ({ input, ctx }) => {
      const item = await db.getAccountPayableById(input.apId); const client = item && await db.getClientById(item.clientId); if (!item || !client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.updateAccountPayable(input.apId, { description: input.description, amount: input.amount ? Number(input.amount) as any : undefined, dueDate: input.dueDate, vendor: input.vendor, category: input.category, notes: input.notes, status: input.status });
    }),
    updateStatus: consultorProcedure.input(z.object({ apId: z.number(), status: z.enum(["pendente", "pago", "vencido", "cancelado"]), paymentDate: z.date().optional() })).mutation(async ({ input, ctx }) => {
      const item = await db.getAccountPayableById(input.apId); const client = item && await db.getClientById(item.clientId); if (!item || !client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.updateAccountPayable(input.apId, { status: input.status, paymentDate: input.status === "pago" ? input.paymentDate ?? new Date() : undefined });
    }),
    delete: consultorProcedure.input(z.object({ apId: z.number() })).mutation(async ({ input, ctx }) => {
      const item = await db.getAccountPayableById(input.apId); const client = item && await db.getClientById(item.clientId); if (!item || !client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.deleteAccountPayable(input.apId);
    }),
  }),

  accountsReceivable: router({
    list: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => { await requireClientAccess(input.clientId, ctx); return db.getAccountsReceivableByClient(input.clientId); }),
    create: consultorProcedure.input(z.object({ clientId: z.number(), description: z.string().min(2), amount: money, dueDate: z.date(), customer: z.string().optional(), invoiceNumber: z.string().optional(), notes: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId); if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.createAccountReceivable({ ...input, amount: Number(input.amount) as any });
    }),
    update: consultorProcedure.input(z.object({ arId: z.number(), description: z.string().min(2).optional(), amount: money.optional(), dueDate: z.date().optional(), customer: z.string().optional(), invoiceNumber: z.string().optional(), notes: z.string().optional(), status: z.enum(["pendente", "pago", "vencido", "cancelado"]).optional() })).mutation(async ({ input, ctx }) => {
      const item = await db.getAccountReceivableById(input.arId); const client = item && await db.getClientById(item.clientId); if (!item || !client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.updateAccountReceivable(input.arId, { description: input.description, amount: input.amount ? Number(input.amount) as any : undefined, dueDate: input.dueDate, customer: input.customer, invoiceNumber: input.invoiceNumber, notes: input.notes, status: input.status });
    }),
    updateStatus: consultorProcedure.input(z.object({ arId: z.number(), status: z.enum(["pendente", "pago", "vencido", "cancelado"]), paymentDate: z.date().optional() })).mutation(async ({ input, ctx }) => {
      const item = await db.getAccountReceivableById(input.arId); const client = item && await db.getClientById(item.clientId); if (!item || !client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.updateAccountReceivable(input.arId, { status: input.status, paymentDate: input.status === "pago" ? input.paymentDate ?? new Date() : undefined });
    }),
    delete: consultorProcedure.input(z.object({ arId: z.number() })).mutation(async ({ input, ctx }) => {
      const item = await db.getAccountReceivableById(input.arId); const client = item && await db.getClientById(item.clientId); if (!item || !client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.deleteAccountReceivable(input.arId);
    }),
  }),

  meiWorkflow: router({
    get: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => {
      await requireClientAccess(input.clientId, ctx);
      const existing = await db.getMeiWorkflowByClient(input.clientId);
      return existing ?? { id: 0, clientId: input.clientId, status: "nao_iniciado" as const, steps: defaultSteps.map((step) => ({ step, completed: false })), documents: defaultDocuments.map((name) => ({ name, uploaded: false })), ccmeiDate: null, notes: null, createdAt: new Date(), updatedAt: new Date() };
    }),
    create: consultorProcedure.input(z.object({ clientId: z.number() })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId); if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const existing = await db.getMeiWorkflowByClient(input.clientId); if (existing) return existing;
      return db.createMeiWorkflow({ clientId: input.clientId, status: "nao_iniciado", steps: defaultSteps.map((step) => ({ step, completed: false })), documents: defaultDocuments.map((name) => ({ name, uploaded: false })) });
    }),
    updateStatus: consultorProcedure.input(z.object({ clientId: z.number(), status: z.enum(["nao_iniciado", "em_progresso", "concluido", "cancelado"]), steps: z.array(workflowStep).optional(), documents: z.array(workflowDocument).optional(), notes: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId); if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const existing = await db.getMeiWorkflowByClient(input.clientId);
      const data = { status: input.status, steps: input.steps ?? existing?.steps ?? defaultSteps.map((step) => ({ step, completed: false })), documents: input.documents ?? existing?.documents ?? defaultDocuments.map((name) => ({ name, uploaded: false })), notes: input.notes };
      if (existing) return db.updateMeiWorkflow(input.clientId, data); return db.createMeiWorkflow({ clientId: input.clientId, ...data });
    }),
  }),

  notifications: router({
    list: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => { await requireClientAccess(input.clientId, ctx); return db.getNotificationsByClient(input.clientId); }),
    markAsRead: protectedProcedure.input(z.object({ notificationId: z.number() })).mutation(async ({ input, ctx }) => {
      const notification = await db.getNotificationById(input.notificationId); if (!notification) throw new TRPCError({ code: "NOT_FOUND" }); await requireClientAccess(notification.clientId, ctx); return db.markNotificationAsRead(input.notificationId);
    }),
    createReminder: consultorProcedure.input(z.object({ clientId: z.number(), relatedId: z.number().optional(), title: z.string().min(2), message: z.string().min(2) })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId); if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.createNotification({ clientId: input.clientId, relatedId: input.relatedId, relatedType: input.relatedId ? "accounts_receivable" : undefined, type: "lembrete_cobranca", title: input.title, message: input.message, read: false });
    }),
    generateDueAlerts: consultorProcedure.input(z.object({ clientId: z.number(), daysAhead: z.number().min(0).max(30).default(7) })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId); if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const [payables, receivables, existing] = await Promise.all([db.getAccountsPayableByClient(input.clientId), db.getAccountsReceivableByClient(input.clientId), db.getNotificationsByClient(input.clientId)]);
      const today = new Date(); const limit = new Date(today.getTime() + input.daysAhead * 86400000); let created = 0;
      for (const item of [...payables.map((value) => ({ ...value, relatedType: "accounts_payable" as const })), ...receivables.map((value) => ({ ...value, relatedType: "accounts_receivable" as const }))]) {
        if (item.status === "pago" || item.status === "cancelado") continue;
        const dueDate = new Date(item.dueDate); const overdue = dueDate < today; const dueSoon = dueDate <= limit;
        if (!overdue && !dueSoon) continue;
        const type = overdue ? "vencido" as const : "vencimento_proximo" as const;
        const alreadyExists = existing.some((notification) => notification.relatedId === item.id && notification.type === type);
        if (alreadyExists) continue;
        await db.createNotification({ clientId: input.clientId, type, title: overdue ? "Conta vencida" : "Vencimento próximo", message: `${item.description} · ${new Intl.DateTimeFormat("pt-BR").format(dueDate)} · ${item.relatedType === "accounts_receivable" ? "a receber" : "a pagar"}`, relatedId: item.id, relatedType: item.relatedType, read: false });
        created++;
      }
      return { created };
    }),
  }),

  reports: router({
    list: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => { await requireClientAccess(input.clientId, ctx); return db.getReportsByClient(input.clientId); }),
    generate: consultorProcedure.input(z.object({ clientId: z.number(), month: z.number().min(1).max(12), year: z.number().min(2020).max(2100), reportType: z.enum(["dre", "fluxo_caixa"]) })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId); if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const transactions = await db.getTransactionsByClient(input.clientId);
      const monthly = filterEntriesByMonth(transactions, input.year, input.month);
      const pdf = await buildFinancialReportPdf({ clientName: client.name, businessName: client.businessName, month: input.month, year: input.year, reportType: input.reportType, transactions: monthly });
      const fileName = `${input.year}-${String(input.month).padStart(2, "0")}-${input.reportType}.pdf`;
      const stored = await storagePut(`clients/${input.clientId}/reports/${fileName}`, pdf, "application/pdf");
      const summary = { totalIncome: monthly.filter((item) => item.type === "receita").reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0), totalExpense: monthly.filter((item) => item.type === "despesa").reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0) };
      await db.createReport({ clientId: input.clientId, month: new Date(input.year, input.month - 1, 1), reportType: input.reportType, fileKey: stored.key, fileUrl: stored.url, summary });
      await db.createFileUpload({ clientId: input.clientId, fileName, fileType: "pdf", fileKey: stored.key, fileSize: pdf.byteLength, uploadedBy: ctx.user.id });
      return { success: true, fileKey: stored.key, fileUrl: stored.url, size: pdf.byteLength };
    }),
    download: protectedProcedure.input(z.object({ reportId: z.number() })).query(async ({ input, ctx }) => {
      const report = await db.getReportById(input.reportId); if (!report) throw new TRPCError({ code: "NOT_FOUND" }); await requireClientAccess(report.clientId, ctx); if (!report.fileUrl) throw new TRPCError({ code: "NOT_FOUND", message: "Arquivo ainda não disponível." }); return { fileUrl: report.fileUrl, fileKey: report.fileKey };
    }),
  }),

  files: router({
    list: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => { await requireClientAccess(input.clientId, ctx); return db.getFileUploadsByClient(input.clientId); }),
    upload: consultorProcedure.input(z.object({ clientId: z.number(), fileName: z.string().min(1), contentBase64: z.string().min(1).max(7_000_000), fileType: z.enum(["ofx", "pdf", "csv", "outro"]).default("outro") })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId); if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const buffer = Buffer.from(input.contentBase64, "base64");
      if (buffer.byteLength > 5_000_000) throw new TRPCError({ code: "BAD_REQUEST", message: "O arquivo excede o limite de 5 MB." });
      const stored = await storagePut(`clients/${input.clientId}/documents/${safeName}`, buffer, "application/octet-stream");
      await db.createFileUpload({ clientId: input.clientId, fileName: input.fileName, fileType: input.fileType, fileKey: stored.key, fileSize: buffer.byteLength, uploadedBy: ctx.user.id });
      return { fileKey: stored.key, url: stored.url, fileName: input.fileName };
    }),
  }),
});

export type AppRouter = typeof appRouter;
