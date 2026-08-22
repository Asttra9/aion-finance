import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { parseOFX, isValidOFX } from "./ofxParser";
import { parseMercadoPagoCSV } from "./mercadoPagoParser";
import { storagePut } from "./storage";
import { buildFinancialReportPdf } from "./reportPdf";
import { filterEntriesByMonth } from "./financialCalculations";
import { isValidMoney, parseMoney, toDecimal } from "./financialValues";
import { isValidCpfCnpj, normalizeCpfCnpj } from "../shared/brazilianDocument";
import { hashLocalPassword, verifyLocalPassword } from "./localPassword";

const LOCAL_SESSION_MS = 1000 * 60 * 60 * 12;

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

const money = z.string().refine(isValidMoney, "Informe um valor financeiro válido.");
const cpfCnpj = z.string().trim().max(20).transform(normalizeCpfCnpj).refine((value) => value.length === 0 || isValidCpfCnpj(value), "Informe um CPF ou CNPJ válido.");
const localPassword = z.string().min(10, "A senha deve ter pelo menos 10 caracteres.").max(256).refine((value) => /[a-zA-Z]/.test(value) && /\d/.test(value), "A senha deve incluir letras e números.");
const workflowStep = z.object({ step: z.string(), completed: z.boolean(), completedAt: z.string().optional() });
const workflowDocument = z.object({ name: z.string(), uploaded: z.boolean(), uploadedAt: z.string().optional(), fileKey: z.string().optional() });

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function buildTransactionsCsv(
  transactions: Awaited<ReturnType<typeof db.getTransactionsByClient>>,
  categoryById: Map<number, { name: string }>,
) {
  const header = ["Data", "Descrição", "Tipo", "Categoria", "Contexto", "Status", "Valor (R$)"];
  const rows = transactions.map((transaction) => [
    new Intl.DateTimeFormat("pt-BR").format(new Date(transaction.date)),
    transaction.description,
    transaction.type === "receita" ? "Receita" : "Despesa",
    transaction.categoryId ? categoryById.get(transaction.categoryId)?.name ?? "Sem categoria" : "Sem categoria",
    transaction.financeType === "pessoal" ? "Pessoal" : "Empresarial",
    transaction.status,
    parseMoney(transaction.amount).toFixed(2).replace(".", ","),
  ]);
  return `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(";")).join("\n")}`;
}

function getNextRecurringOccurrence(frequency: "mensal" | "anual", dueDay: number, dueMonth?: number) {
  const now = new Date();
  const targetMonth = frequency === "anual" ? (dueMonth ?? now.getMonth() + 1) - 1 : now.getMonth();
  const lastDay = new Date(now.getFullYear(), targetMonth + 1, 0).getDate();
  const firstAttempt = new Date(now.getFullYear(), targetMonth, Math.min(dueDay, lastDay));
  if (firstAttempt > now) return firstAttempt;
  if (frequency === "anual") {
    const nextYearLastDay = new Date(now.getFullYear() + 1, targetMonth + 1, 0).getDate();
    return new Date(now.getFullYear() + 1, targetMonth, Math.min(dueDay, nextYearLastDay));
  }
  const nextMonth = now.getMonth() + 1;
  const nextMonthLastDay = new Date(now.getFullYear(), nextMonth + 1, 0).getDate();
  return new Date(now.getFullYear(), nextMonth, Math.min(dueDay, nextMonthLastDay));
}

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
    updateProfile: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(120) })).mutation(({ input, ctx }) => db.updateUserProfile(ctx.user.id, input)),
    localLogin: publicProcedure
      .input(z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(256) }))
      .mutation(async ({ input, ctx }) => {
        const invalidCredentials = () => new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha inválidos." });
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.passwordHash) throw invalidCredentials();

        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." });
        }

        if (!(await verifyLocalPassword(input.password, user.passwordHash))) {
          await db.registerFailedLocalLogin(user.id, user.failedLoginAttempts);
          throw invalidCredentials();
        }

        await db.registerSuccessfulLocalLogin(user.id);
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name ?? "", expiresInMs: LOCAL_SESSION_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: LOCAL_SESSION_MS });
        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    invitePreview: publicProcedure
      .input(z.object({ token: z.string().min(40).max(200) }))
      .query(async ({ input }) => {
        const preview = await db.getAccountInvitePreview(input.token);
        if (!preview || preview.state !== "valido") return { state: preview?.state ?? "invalido" } as const;
        return {
          state: "valido" as const,
          client: {
            name: preview.client.name,
            email: preview.invite.email,
            businessType: preview.client.businessType,
            businessName: preview.client.businessName,
            cpfCnpj: preview.client.cpfCnpj,
          },
          expiresAt: preview.invite.expiresAt,
        };
      }),
    acceptInvite: publicProcedure
      .input(z.object({
        token: z.string().min(40).max(200),
        password: localPassword,
        profile: z.discriminatedUnion("profileType", [
          z.object({
            profileType: z.literal("pessoal"),
            personalGoal: z.string().trim().min(2).max(120),
            incomeRange: z.string().trim().min(2).max(80),
          }),
          z.object({
            profileType: z.literal("empresarial"),
            legalName: z.string().trim().min(2).max(255),
            cpfCnpj: cpfCnpj.refine((value) => value.length > 0, "Informe um CNPJ válido."),
            segment: z.string().trim().min(2).max(120),
            revenueRange: z.string().trim().min(2).max(80),
            financialControlMethod: z.string().trim().min(2).max(120),
          }),
        ]),
      }))
      .mutation(async ({ input }) => {
        const preview = await db.getAccountInvitePreview(input.token);
        if (!preview || preview.state !== "valido") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite não está mais disponível." });
        }
        const expectedProfileType = preview.client.businessType === "pessoal" ? "pessoal" : "empresarial";
        if (input.profile.profileType !== expectedProfileType) {
          throw new TRPCError({ code: "FORBIDDEN", message: "A jornada deste convite não pode ser alterada." });
        }
        const accepted = await db.acceptAccountInvite({
          token: input.token,
          passwordHash: await hashLocalPassword(input.password),
          onboarding: input.profile,
        });
        if (accepted.state !== "aceito") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite não está mais disponível." });
        }
        return { success: true } as const;
      }),
    availableConsultants: publicProcedure.query(() => db.getAvailableConsultants()),
    requestAccount: publicProcedure
      .input(z.object({
        name: z.string().trim().min(2).max(255),
        email: z.string().trim().email().max(320),
        password: localPassword,
        businessType: z.enum(["pessoal", "mei"]),
        consultorId: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createAccountAccessRequest({
          consultorId: input.consultorId,
          name: input.name,
          email: input.email,
          passwordHash: await hashLocalPassword(input.password),
          businessType: input.businessType,
        });
        if (result.state === "consultor_invalido") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "O Consultor Aion selecionado não está disponível." });
        }
        return { success: true } as const;
      }),
  }),

  moderation: router({
    listRequests: consultorProcedure.query(({ ctx }) => db.getAccountAccessRequestsByConsultor(ctx.user.id)),
    pendingCount: consultorProcedure.query(({ ctx }) => db.getPendingAccountAccessRequestCount(ctx.user.id)),
    decideRequest: consultorProcedure
      .input(z.object({ requestId: z.number().int().positive(), decision: z.enum(["aprovar", "recusar"]) }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.decideAccountAccessRequest({ requestId: input.requestId, consultorId: ctx.user.id, decision: input.decision });
        if (result.state === "nao_encontrada") throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada." });
        if (result.state === "ja_decidida") throw new TRPCError({ code: "CONFLICT", message: "Esta solicitação já foi processada." });
        if (result.state === "conta_existente") throw new TRPCError({ code: "CONFLICT", message: "Já existe uma conta ativa para este e-mail." });
        return result;
      }),
  }),

  clients: router({
    list: consultorProcedure.query(({ ctx }) => db.getClientsByConsultor(ctx.user.id)),
    get: protectedProcedure.input(z.object({ clientId: z.number() })).query(({ input, ctx }) => requireClientAccess(input.clientId, ctx)),
    me: protectedProcedure.query(({ ctx }) => db.getClientByUserId(ctx.user.id)),
    create: consultorProcedure.input(z.object({
      name: z.string().min(2), email: z.string().email().optional(), phone: z.string().optional(), address: z.string().trim().max(800).optional(), cpfCnpj: cpfCnpj.optional(),
      businessType: z.enum(["pessoal", "mei", "profissional_liberal", "pj"]), businessName: z.string().optional(), serviceModel: z.enum(["recorrente", "pontual"]).optional(), monthlyRevenue: money.optional(), notes: z.string().optional(),
    })).mutation(({ input, ctx }) => db.createClient({ ...input, consultorId: ctx.user.id, monthlyRevenue: input.monthlyRevenue ? toDecimal(input.monthlyRevenue) : undefined })),
    update: consultorProcedure.input(z.object({
      clientId: z.number(),
      name: z.string().trim().min(2).max(255).optional(),
      email: z.string().trim().email().max(320).nullable().optional(),
      phone: z.string().trim().max(20).nullable().optional(),
      address: z.string().trim().max(800).nullable().optional(),
      cpfCnpj: cpfCnpj.nullable().optional(),
      businessName: z.string().trim().max(255).nullable().optional(),
      serviceModel: z.enum(["recorrente", "pontual"]).nullable().optional(),
      monthlyRevenue: money.nullable().optional(),
      notes: z.string().trim().max(2000).nullable().optional(),
      status: z.enum(["ativo", "inativo", "em_onboarding"]).optional(),
    })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.updateClient(input.clientId, {
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        cpfCnpj: input.cpfCnpj,
        businessName: input.businessName,
        serviceModel: input.serviceModel,
        monthlyRevenue: input.monthlyRevenue === null ? null : input.monthlyRevenue ? toDecimal(input.monthlyRevenue) : undefined,
        notes: input.notes,
        status: input.status,
      });
    }),
    createInvite: consultorProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const invite = await db.createClientAccountInvite({ clientId: input.clientId, consultorId: ctx.user.id });
          if (!invite) throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode convidar este cliente." });
          return {
            token: invite.token,
            expiresAt: invite.expiresAt,
            email: invite.email,
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível gerar o convite." });
        }
      }),
    revokeInvite: consultorProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const revoked = await db.revokeClientAccountInvite({ clientId: input.clientId, consultorId: ctx.user.id });
        if (!revoked) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhum convite ativo foi encontrado para este cliente." });
        return { success: true } as const;
      }),
  }),

  consultantMetrics: router({
    summary: consultorProcedure.query(({ ctx }) => db.getConsultorPortfolioMetrics(ctx.user.id)),
  }),

  subscriptions: router({
    list: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => {
      await requireClientAccess(input.clientId, ctx);
      return db.getServiceSubscriptionsByClient(input.clientId);
    }),
    create: protectedProcedure.input(z.object({
      clientId: z.number(), name: z.string().trim().min(2).max(140), amount: money,
      billingDay: z.number().int().min(1).max(31),
    })).mutation(async ({ input, ctx }) => {
      await requireClientAccess(input.clientId, ctx);
      const subscription = await db.createServiceSubscription({ clientId: input.clientId, name: input.name, amount: toDecimal(input.amount), billingDay: input.billingDay, status: "ativa" });
      const recurringTransaction = await db.createRecurringTransaction({
        clientId: input.clientId,
        description: input.name,
        amount: toDecimal(input.amount),
        type: "despesa",
        financeType: "pessoal",
        frequency: "mensal",
        dueDay: input.billingDay,
        nextOccurrence: getNextRecurringOccurrence("mensal", input.billingDay),
        status: "ativa",
        notes: "Criada a partir de uma assinatura pessoal.",
      });
      await db.ensureRecurringOccurrencesForClient(input.clientId);
      return { subscription, recurringTransaction };
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
        targetAmount: toDecimal(input.targetAmount),
        savedAmount: toDecimal(input.savedAmount ?? "0"),
        dueDate: input.dueDate,
        color: input.color,
        icon: input.icon,
      });
    }),
    contribute: protectedProcedure.input(z.object({ goalId: z.number(), amount: money, note: z.string().trim().max(280).optional() })).mutation(async ({ input, ctx }) => {
      const goal = await db.getFinancialGoalById(input.goalId);
      if (!goal) throw new TRPCError({ code: "NOT_FOUND", message: "Meta não encontrada." });
      await requireClientAccess(goal.clientId, ctx);
      const nextAmount = parseMoney(goal.savedAmount) + parseMoney(input.amount);
      const contribution = {
        goalId: goal.id,
        clientId: goal.clientId,
        amount: toDecimal(input.amount),
        note: input.note || undefined,
        month: new Date().toISOString().slice(0, 7),
      };
      await db.createFinancialGoalContribution(contribution);
      return db.updateFinancialGoal(goal.id, { savedAmount: toDecimal(nextAmount) });
    }),
    update: protectedProcedure.input(z.object({
      goalId: z.number(), name: z.string().min(2).max(140).optional(), targetAmount: money.optional(), dueDate: z.date().nullable().optional(), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), icon: z.string().max(32).optional(),
    })).mutation(async ({ input, ctx }) => {
      const goal = await db.getFinancialGoalById(input.goalId);
      if (!goal) throw new TRPCError({ code: "NOT_FOUND" });
      await requireClientAccess(goal.clientId, ctx);
      return db.updateFinancialGoal(goal.id, { name: input.name, targetAmount: input.targetAmount ? toDecimal(input.targetAmount) : undefined, dueDate: input.dueDate, color: input.color, icon: input.icon });
    }),
    delete: protectedProcedure.input(z.object({ goalId: z.number() })).mutation(async ({ input, ctx }) => {
      const goal = await db.getFinancialGoalById(input.goalId);
      if (!goal) throw new TRPCError({ code: "NOT_FOUND" });
      await requireClientAccess(goal.clientId, ctx);
      return db.deleteFinancialGoal(goal.id);
    }),
  }),

  transactions: router({
    list: protectedProcedure.input(z.object({ clientId: z.number(), limit: z.number().int().min(1).max(500).optional() })).query(async ({ input, ctx }) => { await requireClientAccess(input.clientId, ctx); return input.limit ? db.getRecentTransactionsByClient(input.clientId, input.limit) : db.getTransactionsByClient(input.clientId); }),
    categories: consultorProcedure.query(({ ctx }) => db.getTransactionCategories(ctx.user.id)),
    categoriesForClient: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => {
      const client = await requireClientAccess(input.clientId, ctx);
      return db.getTransactionCategories(client.consultorId);
    }),
    createCategory: consultorProcedure.input(z.object({ name: z.string().min(2), type: z.enum(["receita", "despesa"]), color: z.string().optional(), isFixedCost: z.boolean().optional() })).mutation(({ input, ctx }) => db.createTransactionCategory({ ...input, consultorId: ctx.user.id })),
    updateCategory: consultorProcedure.input(z.object({ categoryId: z.number(), name: z.string().min(2).optional(), color: z.string().nullable().optional(), isFixedCost: z.boolean().optional() })).mutation(async ({ input, ctx }) => {
      const category = await db.getTransactionCategoryById(input.categoryId);
      if (!category || category.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.updateTransactionCategory(input.categoryId, { name: input.name, color: input.color ?? undefined, isFixedCost: input.isFixedCost });
    }),
    create: consultorProcedure.input(z.object({ clientId: z.number(), categoryId: z.number().optional(), date: z.date(), description: z.string().min(2), amount: money, type: z.enum(["receita", "despesa"]), financeType: z.enum(["pessoal", "empresarial"]).default("empresarial"), notes: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.createTransaction({ ...input, amount: toDecimal(input.amount) });
    }),
    importOfx: consultorProcedure.input(z.object({ clientId: z.number(), fileName: z.string().min(1), content: z.string().min(20).max(5_000_000), financeType: z.enum(["pessoal", "empresarial"]).default("empresarial"), categoryId: z.number().optional() })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (!isValidOFX(input.content)) throw new TRPCError({ code: "BAD_REQUEST", message: "Arquivo OFX inválido ou incompleto." });
      const parsed = parseOFX(input.content);
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const stored = await storagePut(`clients/${input.clientId}/ofx/${safeName}`, Buffer.from(input.content, "utf8"), "application/x-ofx");
      await db.createFileUpload({ clientId: input.clientId, fileName: input.fileName, fileType: "ofx", fileKey: stored.key, fileSize: Buffer.byteLength(input.content), uploadedBy: ctx.user.id });
      const existingIds = await db.getExistingTransactionOfxIds(input.clientId, parsed.transactions.map((transaction) => transaction.ofxId));
      const identifiersInFile = new Set<string>();
      const newTransactions = parsed.transactions.filter((transaction) => {
        if (existingIds.has(transaction.ofxId) || identifiersInFile.has(transaction.ofxId)) return false;
        identifiersInFile.add(transaction.ofxId);
        return true;
      });
      await db.createTransactions(newTransactions.map((transaction) => ({ clientId: input.clientId, categoryId: input.categoryId, date: transaction.date, description: transaction.description, amount: toDecimal(transaction.amount), type: transaction.type, financeType: input.financeType, status: "pendente", ofxId: transaction.ofxId })));
      const imported = newTransactions.length;
      const skipped = parsed.transactions.length - imported;
      return { imported, skipped, errors: parsed.errors, fileKey: stored.key, accountNumber: parsed.accountNumber, bankCode: parsed.bankCode };
    }),
    importMercadoPago: consultorProcedure.input(z.object({ clientId: z.number(), fileName: z.string().min(1), content: z.string().min(20).max(5_000_000), financeType: z.enum(["pessoal", "empresarial"]).default("empresarial"), categoryId: z.number().optional() })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const parsed = parseMercadoPagoCSV(input.content);
      if (!parsed.transactions.length && parsed.errors.length) throw new TRPCError({ code: "BAD_REQUEST", message: parsed.errors[0] });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const stored = await storagePut(`clients/${input.clientId}/mercado-pago/${safeName}`, Buffer.from(input.content, "utf8"), "text/csv");
      await db.createFileUpload({ clientId: input.clientId, fileName: input.fileName, fileType: "csv", fileKey: stored.key, fileSize: Buffer.byteLength(input.content), uploadedBy: ctx.user.id });
      const newItems = parsed.transactions.filter((transaction) => transaction.kind === "transaction");
      const existingIds = await db.getExistingTransactionOfxIds(input.clientId, newItems.map((transaction) => `mp:${transaction.operationId}`));
      const idsInFile = new Set<string>();
      const newTransactions = newItems.filter((transaction) => {
        const identifier = `mp:${transaction.operationId}`;
        if (existingIds.has(identifier) || idsInFile.has(identifier)) return false;
        idsInFile.add(identifier);
        return true;
      });
      await db.createTransactions(newTransactions.map((transaction) => ({ clientId: input.clientId, categoryId: input.categoryId, date: transaction.date, description: transaction.description, amount: toDecimal(transaction.amount), type: transaction.type, financeType: input.financeType, status: "pendente", ofxId: `mp:${transaction.operationId}` })));
      let cancelled = 0;
      for (const refund of parsed.transactions.filter((transaction) => transaction.kind === "refund" && transaction.relatedOperationId)) {
        const original = await db.getTransactionByOfxId(input.clientId, `mp:${refund.relatedOperationId}`);
        if (original && original.status !== "cancelado") {
          await db.updateTransaction(original.id, { status: "cancelado", notes: `Cancelada por devolução Mercado Pago: ${refund.operationId}` });
          cancelled += 1;
        }
      }
      return { imported: newTransactions.length, skipped: newItems.length - newTransactions.length, cancelled, errors: parsed.errors, fileKey: stored.key };
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
    reconcileAllPending: consultorProcedure.input(z.object({ clientId: z.number() })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.reconcilePendingTransactionsByClient(input.clientId);
    }),
    delete: consultorProcedure.input(z.object({ transactionId: z.number() })).mutation(async ({ input, ctx }) => {
      const transaction = await db.getTransactionById(input.transactionId);
      if (!transaction) throw new TRPCError({ code: "NOT_FOUND" });
      const client = await db.getClientById(transaction.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.deleteTransaction(input.transactionId);
    }),
  }),

  recurringTransactions: router({
    list: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => {
      await requireClientAccess(input.clientId, ctx);
      return db.getRecurringTransactionsByClient(input.clientId);
    }),
    occurrences: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => {
      await requireClientAccess(input.clientId, ctx);
      return db.getRecurringOccurrencesByClient(input.clientId);
    }),
    create: consultorProcedure.input(z.object({
      clientId: z.number(),
      categoryId: z.number().optional(),
      description: z.string().trim().min(2).max(500),
      amount: money,
      type: z.enum(["receita", "despesa"]),
      financeType: z.enum(["pessoal", "empresarial"]),
      frequency: z.enum(["mensal", "anual"]),
      dueDay: z.number().int().min(1).max(31),
      dueMonth: z.number().int().min(1).max(12).optional(),
      notes: z.string().trim().max(2000).optional(),
    }).superRefine((value, ctx) => {
      if (value.frequency === "anual" && !value.dueMonth) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o mês de vencimento para a recorrência anual.", path: ["dueMonth"] });
    })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const nextOccurrence = getNextRecurringOccurrence(input.frequency, input.dueDay, input.dueMonth);
      const result = await db.createRecurringTransaction({
        clientId: input.clientId,
        categoryId: input.categoryId,
        description: input.description,
        amount: toDecimal(input.amount),
        type: input.type,
        financeType: input.financeType,
        frequency: input.frequency,
        dueDay: input.dueDay,
        dueMonth: input.frequency === "anual" ? input.dueMonth : undefined,
        nextOccurrence,
        notes: input.notes,
        status: "ativa",
      });
      await db.ensureRecurringOccurrencesForClient(input.clientId);
      return result;
    }),
    updateStatus: consultorProcedure.input(z.object({ recurringTransactionId: z.number(), status: z.enum(["ativa", "suspensa"]) })).mutation(async ({ input, ctx }) => {
      const rule = await db.getRecurringTransactionById(input.recurringTransactionId);
      const client = rule && await db.getClientById(rule.clientId);
      if (!rule || !client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.updateRecurringTransaction(rule.id, { status: input.status });
    }),
    generate: consultorProcedure.input(z.object({ clientId: z.number(), daysAhead: z.number().int().min(1).max(366).default(60) })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return { created: await db.ensureRecurringOccurrencesForClient(input.clientId, input.daysAhead) };
    }),
    confirm: consultorProcedure.input(z.object({ occurrenceId: z.number() })).mutation(async ({ input, ctx }) => {
      const item = await db.getRecurringOccurrenceById(input.occurrenceId);
      const client = item && await db.getClientById(item.occurrence.clientId);
      if (!item || !client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      try {
        return await db.confirmRecurringOccurrence(input.occurrenceId);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível confirmar esta previsão." });
      }
    }),
    updateOccurrenceStatus: consultorProcedure.input(z.object({ occurrenceId: z.number(), status: z.enum(["adiado", "cancelado"]) })).mutation(async ({ input, ctx }) => {
      const item = await db.getRecurringOccurrenceById(input.occurrenceId);
      const client = item && await db.getClientById(item.occurrence.clientId);
      if (!item || !client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (item.occurrence.status === "confirmado") throw new TRPCError({ code: "BAD_REQUEST", message: "Uma previsão confirmada não pode ser alterada." });
      return db.updateRecurringOccurrenceStatus(input.occurrenceId, input.status);
    }),
  }),

  accountsPayable: router({
    list: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }) => { await requireClientAccess(input.clientId, ctx); return db.getAccountsPayableByClient(input.clientId); }),
    create: consultorProcedure.input(z.object({ clientId: z.number(), description: z.string().min(2), amount: money, dueDate: z.date(), vendor: z.string().optional(), category: z.string().optional(), notes: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId); if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.createAccountPayable({ ...input, amount: toDecimal(input.amount) });
    }),
    update: consultorProcedure.input(z.object({ apId: z.number(), description: z.string().min(2).optional(), amount: money.optional(), dueDate: z.date().optional(), vendor: z.string().optional(), category: z.string().optional(), notes: z.string().optional(), status: z.enum(["pendente", "pago", "vencido", "cancelado"]).optional() })).mutation(async ({ input, ctx }) => {
      const item = await db.getAccountPayableById(input.apId); const client = item && await db.getClientById(item.clientId); if (!item || !client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.updateAccountPayable(input.apId, { description: input.description, amount: input.amount ? toDecimal(input.amount) : undefined, dueDate: input.dueDate, vendor: input.vendor, category: input.category, notes: input.notes, status: input.status });
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
      return db.createAccountReceivable({ ...input, amount: toDecimal(input.amount) });
    }),
    update: consultorProcedure.input(z.object({ arId: z.number(), description: z.string().min(2).optional(), amount: money.optional(), dueDate: z.date().optional(), customer: z.string().optional(), invoiceNumber: z.string().optional(), notes: z.string().optional(), status: z.enum(["pendente", "pago", "vencido", "cancelado"]).optional() })).mutation(async ({ input, ctx }) => {
      const item = await db.getAccountReceivableById(input.arId); const client = item && await db.getClientById(item.clientId); if (!item || !client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return db.updateAccountReceivable(input.arId, { description: input.description, amount: input.amount ? toDecimal(input.amount) : undefined, dueDate: input.dueDate, customer: input.customer, invoiceNumber: input.invoiceNumber, notes: input.notes, status: input.status });
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
    resolve: protectedProcedure.input(z.object({ notificationId: z.number(), resolutionNote: z.string().trim().max(280).optional() })).mutation(async ({ input, ctx }) => {
      const notification = await db.getNotificationById(input.notificationId);
      if (!notification) throw new TRPCError({ code: "NOT_FOUND" });
      await requireClientAccess(notification.clientId, ctx);
      if (notification.resolvedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Este alerta já foi resolvido." });
      return db.resolveNotification(input.notificationId, input.resolutionNote || undefined);
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
    generate: protectedProcedure.input(z.object({ clientId: z.number(), month: z.number().min(1).max(12), year: z.number().min(2020).max(2100), reportType: z.enum(["dre", "fluxo_caixa", "resumo_pessoal"]) })).mutation(async ({ input, ctx }) => {
      const client = await requireClientAccess(input.clientId, ctx);
      const isPersonal = client.businessType === "pessoal";
      if (input.reportType === "resumo_pessoal" && !isPersonal) throw new TRPCError({ code: "BAD_REQUEST", message: "O resumo pessoal está disponível apenas para a jornada pessoal." });
      if (input.reportType === "dre" && isPersonal) throw new TRPCError({ code: "BAD_REQUEST", message: "A DRE gerencial está disponível para a jornada empreendedora." });
      const transactions = await db.getTransactionsByClient(input.clientId);
      const monthly = filterEntriesByMonth(transactions, input.year, input.month);
      const previousDate = new Date(input.year, input.month - 2, 1);
      const previous = filterEntriesByMonth(transactions, previousDate.getFullYear(), previousDate.getMonth() + 1);
      const categories = await db.getTransactionCategories(client.consultorId);
      const categoryById = new Map(categories.map((category) => [category.id, category]));
      const reportEntries = monthly.map((transaction) => {
        const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined;
        return { ...transaction, category: category?.name, isFixedCost: category?.isFixedCost };
      });
      const previousEntries = previous.map((transaction) => {
        const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined;
        return { ...transaction, category: category?.name, isFixedCost: category?.isFixedCost };
      });
      const [payables, goals] = input.reportType === "resumo_pessoal"
        ? await Promise.all([db.getAccountsPayableByClient(input.clientId), db.getFinancialGoalsByClient(input.clientId)])
        : [[], []];
      const pdf = await buildFinancialReportPdf({
        clientName: client.name,
        businessName: client.businessName,
        month: input.month,
        year: input.year,
        reportType: input.reportType,
        transactions: reportEntries,
        previousTransactions: previousEntries,
        upcomingAccounts: payables.filter((account) => account.status === "pendente" || account.status === "vencido").map((account) => ({ description: account.description, amount: account.amount, dueDate: account.dueDate })),
        goals: goals.map((goal) => ({ name: goal.name, targetAmount: goal.targetAmount, savedAmount: goal.savedAmount })),
      });
      const fileName = `${input.year}-${String(input.month).padStart(2, "0")}-${input.reportType}.pdf`;
      const stored = await storagePut(`clients/${input.clientId}/reports/${fileName}`, pdf, "application/pdf");
      const summary = { totalIncome: monthly.filter((item) => item.type === "receita").reduce((sum, item) => sum + parseMoney(item.amount), 0), totalExpense: monthly.filter((item) => item.type === "despesa").reduce((sum, item) => sum + parseMoney(item.amount), 0) };
      await db.createReport({ clientId: input.clientId, month: new Date(input.year, input.month - 1, 1), reportType: input.reportType, fileKey: stored.key, fileUrl: stored.url, summary });
      await db.createFileUpload({ clientId: input.clientId, fileName, fileType: "pdf", fileKey: stored.key, fileSize: pdf.byteLength, uploadedBy: ctx.user.id });
      return { success: true, fileKey: stored.key, fileUrl: stored.url, size: pdf.byteLength };
    }),
    exportCsv: consultorProcedure.input(z.object({ clientId: z.number(), month: z.number().min(1).max(12), year: z.number().min(2020).max(2100) })).query(async ({ input, ctx }) => {
      const client = await db.getClientById(input.clientId);
      if (!client || client.consultorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const [transactions, categories] = await Promise.all([
        db.getTransactionsByClient(input.clientId),
        db.getTransactionCategories(client.consultorId),
      ]);
      const monthlyTransactions = filterEntriesByMonth(transactions, input.year, input.month);
      const categoryById = new Map(categories.map((category) => [category.id, category]));
      const fileName = `aion-movimentacoes-${input.year}-${String(input.month).padStart(2, "0")}.csv`;
      return { fileName, content: buildTransactionsCsv(monthlyTransactions, categoryById), count: monthlyTransactions.length };
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
