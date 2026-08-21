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
  getRecurringTransactionsByClient: vi.fn(),
  getRecurringTransactionById: vi.fn(),
  createRecurringTransaction: vi.fn(),
  updateRecurringTransaction: vi.fn(),
  ensureRecurringOccurrencesForClient: vi.fn(),
  getRecurringOccurrencesByClient: vi.fn(),
  getRecurringOccurrenceById: vi.fn(),
  confirmRecurringOccurrence: vi.fn(),
  updateRecurringOccurrenceStatus: vi.fn(),
  createClientAccountInvite: vi.fn(),
  revokeClientAccountInvite: vi.fn(),
  getAccountInvitePreview: vi.fn(),
  acceptAccountInvite: vi.fn(),
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
const inviteToken = "a".repeat(43);
const invitedClient = {
  ...client,
  email: "cliente@example.com",
  businessType: "pessoal" as const,
  businessName: null,
  cpfCnpj: null,
};

describe("convites e ativação de conta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getClientById.mockResolvedValue(invitedClient);
    dbMocks.getAccountInvitePreview.mockResolvedValue({
      state: "valido",
      invite: { email: invitedClient.email, expiresAt: new Date(Date.now() + 86400000) },
      client: invitedClient,
    });
  });

  it("permite ao consultor responsável gerar um convite sem expor dados de persistência", async () => {
    dbMocks.createClientAccountInvite.mockResolvedValue({ token: inviteToken, email: invitedClient.email, expiresAt: new Date(Date.now() + 86400000) });
    const caller = appRouter.createCaller(createConsultorContext());
    await expect(caller.clients.createInvite({ clientId: 3 })).resolves.toEqual(expect.objectContaining({ token: inviteToken, email: invitedClient.email }));
    expect(dbMocks.createClientAccountInvite).toHaveBeenCalledWith({ clientId: 3, consultorId: 11 });
  });

  it("impede a emissão por um consultor que não responde pela carteira", async () => {
    dbMocks.createClientAccountInvite.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createConsultorContext());
    await expect(caller.clients.createInvite({ clientId: 3 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("retorna o estado de expiração sem revelar informações cadastrais", async () => {
    dbMocks.getAccountInvitePreview.mockResolvedValue({ state: "expirado" });
    const caller = appRouter.createCaller(createClientContext());
    await expect(caller.auth.invitePreview({ token: inviteToken })).resolves.toEqual({ state: "expirado" });
  });

  it("revoga um convite pendente somente para a carteira autorizada", async () => {
    dbMocks.revokeClientAccountInvite.mockResolvedValue(true);
    const caller = appRouter.createCaller(createConsultorContext());
    await expect(caller.clients.revokeInvite({ clientId: 3 })).resolves.toEqual({ success: true });
    expect(dbMocks.revokeClientAccountInvite).toHaveBeenCalledWith({ clientId: 3, consultorId: 11 });
  });

  it("aceita a ativação pessoal com senha em hash e preferências sem criar lançamentos", async () => {
    dbMocks.acceptAccountInvite.mockResolvedValue({ state: "aceito", userId: 7, clientId: 3 });
    const caller = appRouter.createCaller(createClientContext());
    await expect(caller.auth.acceptInvite({
      token: inviteToken,
      password: "SenhaAion2026",
      profile: { profileType: "pessoal", personalGoal: "Organizar gastos", incomeRange: "Até R$ 2 mil" },
    })).resolves.toEqual({ success: true });
    expect(dbMocks.acceptAccountInvite).toHaveBeenCalledWith(expect.objectContaining({
      token: inviteToken,
      passwordHash: expect.stringMatching(/^scrypt\$/),
      onboarding: { profileType: "pessoal", personalGoal: "Organizar gastos", incomeRange: "Até R$ 2 mil" },
    }));
    expect(dbMocks.acceptAccountInvite.mock.calls[0]?.[0]?.passwordHash).not.toContain("SenhaAion2026");
  });

  it("aceita a ativação empresarial apenas com CNPJ válido e preserva a jornada", async () => {
    const businessClient = { ...invitedClient, businessType: "mei" as const };
    dbMocks.getAccountInvitePreview.mockResolvedValue({ state: "valido", invite: { email: invitedClient.email, expiresAt: new Date(Date.now() + 86400000) }, client: businessClient });
    dbMocks.acceptAccountInvite.mockResolvedValue({ state: "aceito", userId: 7, clientId: 3 });
    const caller = appRouter.createCaller(createClientContext());
    await expect(caller.auth.acceptInvite({
      token: inviteToken,
      password: "SenhaAion2026",
      profile: { profileType: "empresarial", legalName: "Aion Serviços LTDA", cpfCnpj: "04.252.011/0001-10", segment: "Serviços", revenueRange: "Até R$ 50 mil", financialControlMethod: "Planilha" },
    })).resolves.toEqual({ success: true });
    expect(dbMocks.acceptAccountInvite).toHaveBeenCalledWith(expect.objectContaining({ onboarding: expect.objectContaining({ profileType: "empresarial", cpfCnpj: "04252011000110" }) }));
  });

  it("bloqueia reutilização de convite já aceito", async () => {
    dbMocks.getAccountInvitePreview.mockResolvedValue({ state: "aceito" });
    const caller = appRouter.createCaller(createClientContext());
    await expect(caller.auth.acceptInvite({
      token: inviteToken,
      password: "SenhaAion2026",
      profile: { profileType: "pessoal", personalGoal: "Poupar", incomeRange: "Até R$ 2 mil" },
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.acceptAccountInvite).not.toHaveBeenCalled();
  });
});

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

describe("recurringTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getClientById.mockResolvedValue(client);
    dbMocks.createRecurringTransaction.mockResolvedValue({ id: 81, clientId: 3, status: "ativa" });
    dbMocks.ensureRecurringOccurrencesForClient.mockResolvedValue(1);
    dbMocks.getRecurringOccurrenceById.mockResolvedValue({
      occurrence: { id: 91, clientId: 3, status: "previsto" },
      rule: { id: 81, clientId: 3, description: "Sistema", amount: "89.90" },
    });
    dbMocks.confirmRecurringOccurrence.mockResolvedValue({ transaction: { id: 101 }, occurrence: { id: 91, status: "confirmado" } });
  });

  it("cria uma regra mensal e prepara a primeira previsão sem lançar a despesa efetiva", async () => {
    const caller = appRouter.createCaller(createConsultorContext());
    await caller.recurringTransactions.create({ clientId: 3, description: "Sistema", amount: "89.90", type: "despesa", financeType: "empresarial", frequency: "mensal", dueDay: 10 });
    expect(dbMocks.createRecurringTransaction).toHaveBeenCalledWith(expect.objectContaining({ clientId: 3, description: "Sistema", status: "ativa", amount: "89.90" }));
    expect(dbMocks.ensureRecurringOccurrencesForClient).toHaveBeenCalledWith(3);
  });

  it("atualiza previsões de forma idempotente pela rotina explícita", async () => {
    dbMocks.ensureRecurringOccurrencesForClient.mockResolvedValue(0);
    const caller = appRouter.createCaller(createConsultorContext());
    await expect(caller.recurringTransactions.generate({ clientId: 3, daysAhead: 60 })).resolves.toEqual({ created: 0 });
    expect(dbMocks.ensureRecurringOccurrencesForClient).toHaveBeenCalledWith(3, 60);
  });

  it("confirma uma previsão autorizada em lançamento efetivo", async () => {
    const caller = appRouter.createCaller(createConsultorContext());
    await expect(caller.recurringTransactions.confirm({ occurrenceId: 91 })).resolves.toEqual(expect.objectContaining({ transaction: { id: 101 } }));
    expect(dbMocks.confirmRecurringOccurrence).toHaveBeenCalledWith(91);
  });

  it("impede que o cliente confirme previsões operacionais por contrato interno", async () => {
    const caller = appRouter.createCaller(createClientContext());
    await expect(caller.recurringTransactions.confirm({ occurrenceId: 91 })).rejects.toMatchObject({ code: "FORBIDDEN" });
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

  it("permite que o consultor atualize dados cadastrais completos do cliente", async () => {
    const caller = appRouter.createCaller(createConsultorContext());
    await caller.clients.update({
      clientId: 3,
      name: "Cliente atualizado",
      cpfCnpj: "12345678909",
      address: "Rua das Flores, 123 — Centro",
      phone: "11999999999",
      email: "cliente.atualizado@example.com",
      businessName: "Negócio Atualizado",
      serviceModel: "recorrente",
      monthlyRevenue: "3200.50",
      notes: "Cadastro revisado",
      status: "ativo",
    });
    expect(dbMocks.updateClient).toHaveBeenCalledWith(3, expect.objectContaining({
      name: "Cliente atualizado",
      cpfCnpj: "12345678909",
      address: "Rua das Flores, 123 — Centro",
      monthlyRevenue: "3200.50",
    }));
  });

  it("registra endereço e identificação quando o consultor cria um cliente", async () => {
    const caller = appRouter.createCaller(createConsultorContext());
    await caller.clients.create({
      name: "Novo cliente MEI",
      businessType: "mei",
      cpfCnpj: "11222333000181",
      address: "Avenida Aion, 100 — Centro",
      phone: "1133334444",
    });
    expect(dbMocks.createClient).toHaveBeenCalledWith(expect.objectContaining({
      consultorId: 11,
      cpfCnpj: "11222333000181",
      address: "Avenida Aion, 100 — Centro",
    }));
  });

  it("impede que o cliente altere o próprio cadastro financeiro", async () => {
    const caller = appRouter.createCaller(createClientContext());
    await expect(caller.clients.update({ clientId: 3, name: "Alteração não autorizada" })).rejects.toMatchObject({ code: "FORBIDDEN" });
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
