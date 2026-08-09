import { COOKIE_NAME } from "@shared/const";
import type { TrpcContext } from "./_core/context";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

// ===== MIDDLEWARE =====

const consultorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "consultor_aion" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

// ===== ROUTERS =====

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ===== CLIENT MANAGEMENT =====
  clients: router({
    list: consultorProcedure.query(async ({ ctx }) => {
      return db.getClientsByConsultor(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Verify access: consultor can see all clients, cliente can only see their own
        if (
          ctx.user.role === "cliente" &&
          client.userId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return client;
      }),

    create: consultorProcedure
      .input(
        z.object({
          name: z.string(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          cpfCnpj: z.string().optional(),
          businessType: z.enum(["mei", "profissional_liberal", "pj"]),
          businessName: z.string().optional(),
          monthlyRevenue: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.createClient({
          consultorId: ctx.user.id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          cpfCnpj: input.cpfCnpj,
          businessType: input.businessType,
          businessName: input.businessName,
          monthlyRevenue: input.monthlyRevenue
            ? (parseFloat(input.monthlyRevenue) as any)
            : undefined,
          notes: input.notes,
        });
      }),

    update: consultorProcedure
      .input(
        z.object({
          clientId: z.number(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          businessName: z.string().optional(),
          monthlyRevenue: z.string().optional(),
          notes: z.string().optional(),
          status: z.enum(["ativo", "inativo", "em_onboarding"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client || client.consultorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db.updateClient(input.clientId, {
          name: input.name,
          email: input.email,
          phone: input.phone,
          businessName: input.businessName,
          monthlyRevenue: input.monthlyRevenue
            ? (parseFloat(input.monthlyRevenue) as any)
            : undefined,
          notes: input.notes,
          status: input.status,
        });
      }),
  }),

  // ===== TRANSACTIONS =====
  transactions: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Verify access
        if (
          ctx.user.role === "cliente" &&
          client.userId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db.getTransactionsByClient(input.clientId);
      }),

    create: consultorProcedure
      .input(
        z.object({
          clientId: z.number(),
          categoryId: z.number().optional(),
          date: z.date(),
          description: z.string(),
          amount: z.string(),
          type: z.enum(["receita", "despesa"]),
          financeType: z.enum(["pessoal", "empresarial"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client || client.consultorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db.createTransaction({
          clientId: input.clientId,
          categoryId: input.categoryId,
          date: input.date,
          description: input.description,
          amount: (parseFloat(input.amount) as any),
          type: input.type,
          financeType: input.financeType || "empresarial",
          notes: input.notes,
        });
      }),
  }),

  // ===== ACCOUNTS PAYABLE =====
  accountsPayable: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (
          ctx.user.role === "cliente" &&
          client.userId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db.getAccountsPayableByClient(input.clientId);
      }),

    create: consultorProcedure
      .input(
        z.object({
          clientId: z.number(),
          description: z.string(),
          amount: z.string(),
          dueDate: z.date(),
          vendor: z.string().optional(),
          category: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client || client.consultorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db.createAccountPayable({
          clientId: input.clientId,
          description: input.description,
          amount: (parseFloat(input.amount) as any),
          dueDate: input.dueDate,
          vendor: input.vendor,
          category: input.category,
          notes: input.notes,
        });
      }),

    updateStatus: consultorProcedure
      .input(
        z.object({
          apId: z.number(),
          status: z.enum(["pendente", "pago", "vencido", "cancelado"]),
          paymentDate: z.date().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.updateAccountPayable(input.apId, {
          status: input.status,
          paymentDate: input.paymentDate,
        });
      }),
  }),

  // ===== ACCOUNTS RECEIVABLE =====
  accountsReceivable: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (
          ctx.user.role === "cliente" &&
          client.userId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db.getAccountsReceivableByClient(input.clientId);
      }),

    create: consultorProcedure
      .input(
        z.object({
          clientId: z.number(),
          description: z.string(),
          amount: z.string(),
          dueDate: z.date(),
          customer: z.string().optional(),
          invoiceNumber: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client || client.consultorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db.createAccountReceivable({
          clientId: input.clientId,
          description: input.description,
          amount: (parseFloat(input.amount) as any),
          dueDate: input.dueDate,
          customer: input.customer,
          invoiceNumber: input.invoiceNumber,
          notes: input.notes,
        });
      }),

    updateStatus: consultorProcedure
      .input(
        z.object({
          arId: z.number(),
          status: z.enum(["pendente", "pago", "vencido", "cancelado"]),
          paymentDate: z.date().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.updateAccountReceivable(input.arId, {
          status: input.status,
          paymentDate: input.paymentDate,
        });
      }),
  }),

  // ===== MEI WORKFLOW =====
  meiWorkflow: router({
    get: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (
          ctx.user.role === "cliente" &&
          client.userId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db.getMeiWorkflowByClient(input.clientId);
      }),

    create: consultorProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client || client.consultorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db.createMeiWorkflow({
          clientId: input.clientId,
          status: "nao_iniciado",
          steps: [],
          documents: [],
        });
      }),

    updateStatus: consultorProcedure
      .input(
        z.object({
          clientId: z.number(),
          status: z.enum(["nao_iniciado", "em_progresso", "concluido", "cancelado"]),
          steps: z
            .array(
              z.object({
                step: z.string(),
                completed: z.boolean(),
                completedAt: z.string().optional(),
              })
            )
            .optional(),
          documents: z
            .array(
              z.object({
                name: z.string(),
                uploaded: z.boolean(),
                uploadedAt: z.string().optional(),
                fileKey: z.string().optional(),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client || client.consultorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db.updateMeiWorkflow(input.clientId, {
          status: input.status,
          steps: input.steps,
          documents: input.documents,
        });
      }),
  }),

  // ===== NOTIFICATIONS =====
  notifications: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (
          ctx.user.role === "cliente" &&
          client.userId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db.getNotificationsByClient(input.clientId);
      }),

    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        return db.markNotificationAsRead(input.notificationId);
      }),
  }),

  // ===== REPORTS =====
  reports: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (
          ctx.user.role === "cliente" &&
          client.userId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db.getReportsByClient(input.clientId);
      }),

    generate: consultorProcedure
      .input(
        z.object({
          clientId: z.number(),
          month: z.number().min(1).max(12),
          year: z.number(),
          reportType: z.enum(["dre", "fluxo_caixa"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const client = await db.getClientById(input.clientId);
        if (!client || client.consultorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return db.createReport({
          clientId: input.clientId,
          month: new Date(input.year, input.month - 1, 1),
          reportType: input.reportType,
          fileKey: `reports/${input.clientId}/${input.year}-${String(input.month).padStart(2, "0")}-${input.reportType}.pdf`,
          fileUrl: "",
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
