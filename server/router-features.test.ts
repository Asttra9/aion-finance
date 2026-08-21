import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getClientById: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
  getMeiWorkflowByClient: vi.fn(),
  createMeiWorkflow: vi.fn(),
  updateMeiWorkflow: vi.fn(),
  getAccountsPayableByClient: vi.fn(),
  getAccountPayableById: vi.fn(),
  createAccountPayable: vi.fn(),
  updateAccountPayable: vi.fn(),
  deleteAccountPayable: vi.fn(),
  getAccountsReceivableByClient: vi.fn(),
  getAccountReceivableById: vi.fn(),
  createAccountReceivable: vi.fn(),
  updateAccountReceivable: vi.fn(),
  deleteAccountReceivable: vi.fn(),
  getFinancialGoalsByClient: vi.fn(),
  getFinancialGoalById: vi.fn(),
  createFinancialGoal: vi.fn(),
  updateFinancialGoal: vi.fn(),
  deleteFinancialGoal: vi.fn(),
  createFinancialGoalContribution: vi.fn(),
  getFinancialGoalContributionsByClient: vi.fn(),
  getTransactionById: vi.fn(),
  getTransactionsByClient: vi.fn(),
  getTransactionCategories: vi.fn(),
  reconcilePendingTransactionsByClient: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  getReportById: vi.fn(),
  getNotificationsByClient: vi.fn(),
  getNotificationById: vi.fn(),
  createNotification: vi.fn(),
  resolveNotification: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";

function createConsultorContext(): TrpcContext {
  return {
    user: {
      id: 11,
      openId: "consultor-user",
      name: "Consultor Aion",
      email: "consultor@example.com",
      loginMethod: "manus",
      role: "consultor_aion",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

function createClientContext(userId = 7): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "client-user",
      name: "Cliente",
      email: "cliente@example.com",
      loginMethod: "manus",
      role: "cliente",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const client = { id: 3, consultorId: 11, userId: 7, name: "Cliente" };

describe("notifications.generateDueAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getClientById.mockResolvedValue(client);
    dbMocks.getAccountsPayableByClient.mockResolvedValue([
      { id: 31, description: "Aluguel", dueDate: new Date(Date.now() + 2 * 86400000), status: "pendente" },
    ]);
    dbMocks.getAccountsReceivableByClient.mockResolvedValue([]);
    dbMocks.getNotificationsByClient.mockResolvedValue([]);
    dbMocks.createNotification.mockResolvedValue({ id: 1 });
  });

  it("cria um alerta de vencimento próximo e evita itens pagos", async () => {
    const caller = appRouter.createCaller(createConsultorContext());
    const result = await caller.notifications.generateDueAlerts({ clientId: 3, daysAhead: 7 });
    expect(result).toEqual({ created: 1 });
    expect(dbMocks.createNotification).toHaveBeenCalledWith(expect.objectContaining({ clientId: 3, relatedId: 31, type: "vencimento_proximo" }));
  });

  it("não duplica um alerta já existente para o mesmo item", async () => {
    dbMocks.getNotificationsByClient.mockResolvedValue([{ id: 9, relatedId: 31, type: "vencimento_proximo" }]);
    const caller = appRouter.createCaller(createConsultorContext());
    await expect(caller.notifications.generateDueAlerts({ clientId: 3, daysAhead: 7 })).resolves.toEqual({ created: 0 });
    expect(dbMocks.createNotification).not.toHaveBeenCalled();
  });
});

describe("notifications.resolve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getClientById.mockResolvedValue(client);
    dbMocks.getNotificationById.mockResolvedValue({ id: 14, clientId: 3, resolvedAt: null });
    dbMocks.resolveNotification.mockResolvedValue({ success: true });
  });

  it("resolve um alerta do próprio cliente e registra a observação", async () => {
    const caller = appRouter.createCaller(createClientContext());
    await expect(caller.notifications.resolve({ notificationId: 14, resolutionNote: "Pagamento confirmado." })).resolves.toEqual({ success: true });
    expect(dbMocks.resolveNotification).toHaveBeenCalledWith(14, "Pagamento confirmado.");
  });

  it("impede resolver um alerta já encerrado", async () => {
    dbMocks.getNotificationById.mockResolvedValue({ id: 14, clientId: 3, resolvedAt: new Date() });
    const caller = appRouter.createCaller(createClientContext());
    await expect(caller.notifications.resolve({ notificationId: 14 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("transactions.reconcileAllPending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getClientById.mockResolvedValue(client);
    dbMocks.reconcilePendingTransactionsByClient.mockResolvedValue({ reconciled: 4 });
  });

  it("concilia apenas as pendências do cliente autorizado", async () => {
    const caller = appRouter.createCaller(createConsultorContext());
    await expect(caller.transactions.reconcileAllPending({ clientId: 3 })).resolves.toEqual({ reconciled: 4 });
    expect(dbMocks.reconcilePendingTransactionsByClient).toHaveBeenCalledWith(3);
  });

  it("impede que um cliente execute a conciliação em lote", async () => {
    const caller = appRouter.createCaller(createClientContext());
    await expect(caller.transactions.reconcileAllPending({ clientId: 3 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("meiWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getClientById.mockResolvedValue(client);
    dbMocks.getMeiWorkflowByClient.mockResolvedValue(undefined);
    dbMocks.createMeiWorkflow.mockResolvedValue({ id: 4, clientId: 3, status: "em_progresso" });
    dbMocks.updateMeiWorkflow.mockResolvedValue({ id: 4, clientId: 3, status: "concluido" });
  });

  it("retorna um checklist inicial sem inventar dados do cliente", async () => {
    const caller = appRouter.createCaller(createConsultorContext());
    const result = await caller.meiWorkflow.get({ clientId: 3 });
    expect(result.clientId).toBe(3);
    expect(result.status).toBe("nao_iniciado");
    expect(result.steps).toHaveLength(8);
    expect(result.steps.every((step) => step.completed === false)).toBe(true);
    expect(result.documents.every((document) => document.uploaded === false)).toBe(true);
  });

  it("persiste a atualização das etapas e do status", async () => {
    const existing = { id: 4, clientId: 3, status: "em_progresso", steps: [], documents: [], notes: null };
    dbMocks.getMeiWorkflowByClient.mockResolvedValue(existing);
    const caller = appRouter.createCaller(createConsultorContext());
    const steps = [{ step: "Emitir CCMEI", completed: true }];
    await caller.meiWorkflow.updateStatus({ clientId: 3, status: "concluido", steps, notes: "Concluído" });
    expect(dbMocks.updateMeiWorkflow).toHaveBeenCalledWith(3, expect.objectContaining({ status: "concluido", steps, notes: "Concluído" }));
  });
});

describe("financialGoals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getClientById.mockResolvedValue(client);
    dbMocks.getFinancialGoalsByClient.mockResolvedValue([]);
    dbMocks.getFinancialGoalById.mockResolvedValue({ id: 71, clientId: 3, name: "Reserva de segurança", targetAmount: "2000", savedAmount: "350" });
    dbMocks.createFinancialGoal.mockResolvedValue({ id: 71, clientId: 3 });
    dbMocks.updateFinancialGoal.mockResolvedValue({ id: 71, clientId: 3, savedAmount: "500" });
    dbMocks.deleteFinancialGoal.mockResolvedValue({ success: true });
    dbMocks.createFinancialGoalContribution.mockResolvedValue({ id: 1, goalId: 71, clientId: 3, amount: "150" });
    dbMocks.getFinancialGoalContributionsByClient.mockResolvedValue([{ id: 1, goalId: 71, clientId: 3, goalName: "Reserva de segurança", amount: "150", month: "2026-08" }]);
  });

  it("permite criar e aportar em uma caixinha da própria jornada", async () => {
    const caller = appRouter.createCaller(createClientContext());
    await caller.financialGoals.create({ clientId: 3, name: "Reserva de segurança", targetAmount: "2000", color: "#B21D31" });
    await caller.financialGoals.contribute({ goalId: 71, amount: "150" });

    expect(dbMocks.createFinancialGoal).toHaveBeenCalledWith(expect.objectContaining({ clientId: 3, targetAmount: "2000.00", savedAmount: "0.00" }));
    expect(dbMocks.createFinancialGoalContribution).toHaveBeenCalledWith(expect.objectContaining({ goalId: 71, clientId: 3, amount: "150.00" }));
    expect(dbMocks.updateFinancialGoal).toHaveBeenCalledWith(71, expect.objectContaining({ savedAmount: "500.00" }));
  });

  it("retorna o histórico de aportes apenas para o cliente autorizado", async () => {
    const caller = appRouter.createCaller(createClientContext());
    const result = await caller.financialGoals.contributions({ clientId: 3 });

    expect(result).toHaveLength(1);
    expect(dbMocks.getFinancialGoalContributionsByClient).toHaveBeenCalledWith(3);
  });

  it("impede aporte em uma meta vinculada a outro cliente", async () => {
    dbMocks.getFinancialGoalById.mockResolvedValue({ id: 71, clientId: 99, name: "Meta privada", targetAmount: "2000", savedAmount: "350" });
    dbMocks.getClientById.mockResolvedValue({ id: 99, consultorId: 22, userId: 99, name: "Outro cliente" });

    const caller = appRouter.createCaller(createClientContext(7));
    await expect(caller.financialGoals.contribute({ goalId: 71, amount: "150" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("financial CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getClientById.mockResolvedValue(client);
    dbMocks.getAccountPayableById.mockResolvedValue({ id: 41, clientId: 3, description: "Fornecedor" });
    dbMocks.getAccountReceivableById.mockResolvedValue({ id: 51, clientId: 3, description: "Projeto" });
    dbMocks.getTransactionById.mockResolvedValue({ id: 61, clientId: 3, description: "Serviço" });
    dbMocks.createAccountPayable.mockResolvedValue({ id: 41 });
    dbMocks.updateAccountPayable.mockResolvedValue({ id: 41 });
    dbMocks.deleteAccountPayable.mockResolvedValue({ success: true });
    dbMocks.createAccountReceivable.mockResolvedValue({ id: 51 });
    dbMocks.updateAccountReceivable.mockResolvedValue({ id: 51 });
    dbMocks.deleteAccountReceivable.mockResolvedValue({ success: true });
    dbMocks.createTransaction.mockResolvedValue({ id: 61 });
    dbMocks.updateTransaction.mockResolvedValue({ id: 61 });
    dbMocks.deleteTransaction.mockResolvedValue({ success: true });
    dbMocks.createClient.mockResolvedValue({ id: 3, ...client });
    dbMocks.updateClient.mockResolvedValue({ id: 3, ...client });
  });

  it("executa create/update/delete em contas a pagar", async () => {
    const caller = appRouter.createCaller(createConsultorContext());
    await caller.accountsPayable.create({ clientId: 3, description: "Fornecedor", amount: "100", dueDate: new Date("2026-08-15") });
    await caller.accountsPayable.update({ apId: 41, description: "Fornecedor atualizado" });
    await caller.accountsPayable.delete({ apId: 41 });
    expect(dbMocks.createAccountPayable).toHaveBeenCalled();
    expect(dbMocks.updateAccountPayable).toHaveBeenCalledWith(41, expect.objectContaining({ description: "Fornecedor atualizado" }));
    expect(dbMocks.deleteAccountPayable).toHaveBeenCalledWith(41);
  });

  it("executa create/update/delete em contas a receber", async () => {
    const caller = appRouter.createCaller(createConsultorContext());
    await caller.accountsReceivable.create({ clientId: 3, description: "Projeto", amount: "250", dueDate: new Date("2026-08-15") });
    await caller.accountsReceivable.update({ arId: 51, description: "Projeto atualizado" });
    await caller.accountsReceivable.delete({ arId: 51 });
    expect(dbMocks.createAccountReceivable).toHaveBeenCalled();
    expect(dbMocks.updateAccountReceivable).toHaveBeenCalledWith(51, expect.objectContaining({ description: "Projeto atualizado" }));
    expect(dbMocks.deleteAccountReceivable).toHaveBeenCalledWith(51);
  });

  it("executa create/update/delete de transação", async () => {
    const caller = appRouter.createCaller(createConsultorContext());
    await caller.transactions.create({ clientId: 3, description: "Serviço", amount: "250", date: new Date("2026-08-15"), type: "receita", financeType: "empresarial" });
    await caller.transactions.update({ transactionId: 61, financeType: "pessoal" });
    await caller.transactions.delete({ transactionId: 61 });
    expect(dbMocks.createTransaction).toHaveBeenCalled();
    expect(dbMocks.updateTransaction).toHaveBeenCalledWith(61, expect.objectContaining({ financeType: "pessoal" }));
    expect(dbMocks.deleteTransaction).toHaveBeenCalledWith(61);
  });

  it("permite atualizar cliente somente pela trilha do consultor", async () => {
    const caller = appRouter.createCaller(createConsultorContext());
    await caller.clients.update({ clientId: 3, name: "Cliente atualizado" });
    expect(dbMocks.updateClient).toHaveBeenCalledWith(3, expect.objectContaining({ name: "Cliente atualizado" }));
  });
});

describe("financial permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("impede que um Cliente acesse a listagem global de clientes", async () => {
    const caller = appRouter.createCaller(createClientContext());
    await expect(caller.clients.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("impede que um Cliente acesse o relatório de outro cliente", async () => {
    dbMocks.getReportById.mockResolvedValue({ id: 77, clientId: 99, fileUrl: "/manus-storage/private.pdf", fileKey: "private.pdf" });
    dbMocks.getClientById.mockResolvedValue({ id: 99, consultorId: 22, userId: 99, name: "Outro cliente" });
    const caller = appRouter.createCaller(createClientContext(7));
    await expect(caller.reports.download({ reportId: 77 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("exporta CSV mensal somente para o consultor responsável", async () => {
    dbMocks.getClientById.mockResolvedValue(client);
    dbMocks.getTransactionsByClient.mockResolvedValue([{ id: 1, date: new Date("2026-08-15"), description: "Serviço", amount: "250.00", type: "receita", categoryId: 5, financeType: "empresarial", status: "conciliado" }]);
    dbMocks.getTransactionCategories.mockResolvedValue([{ id: 5, name: "Vendas" }]);
    const caller = appRouter.createCaller(createConsultorContext());
    const result = await caller.reports.exportCsv({ clientId: 3, month: 8, year: 2026 });
    expect(result.fileName).toBe("aion-movimentacoes-2026-08.csv");
    expect(result.content).toContain("Serviço");
    await expect(appRouter.createCaller(createClientContext()).reports.exportCsv({ clientId: 3, month: 8, year: 2026 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
