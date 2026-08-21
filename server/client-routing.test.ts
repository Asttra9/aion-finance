import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const appSource = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");
const layoutSource = readFileSync(resolve(projectRoot, "client/src/components/AionDashboardLayout.tsx"), "utf8");
const operationSource = readFileSync(resolve(projectRoot, "client/src/pages/Operacao.tsx"), "utf8");
const personalSource = readFileSync(resolve(projectRoot, "client/src/pages/Pessoal.tsx"), "utf8");
const meiSource = readFileSync(resolve(projectRoot, "client/src/pages/Mei.tsx"), "utf8");
const clientSource = readFileSync(resolve(projectRoot, "client/src/pages/Clientes.tsx"), "utf8");
const reconciliationSource = readFileSync(resolve(projectRoot, "client/src/pages/Conciliacao.tsx"), "utf8");
const reportsSource = readFileSync(resolve(projectRoot, "client/src/pages/Relatorios.tsx"), "utf8");
const transactionsSource = readFileSync(resolve(projectRoot, "client/src/pages/Transacoes.tsx"), "utf8");
const dashboardSource = readFileSync(resolve(projectRoot, "client/src/pages/Dashboard.tsx"), "utf8");
const stylesSource = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");

describe("roteamento contextual da Aion", () => {
  it("mantém a carteira de clientes registrada para o consultor", () => {
    expect(appSource).toContain('<Route path="/clientes" component={ConsultorClientes} />');
    expect(appSource).toContain('<Route path="/clientes/:id/metas" component={ConsultorClientGoals} />');
  });

  it("encaminha a rota raiz para a visão contextual e não expõe relatórios globais", () => {
    expect(appSource).toContain('navigate("/dashboard")');
    expect(appSource).toContain('<Route path="/" component={AuthenticatedRoot} />');
    expect(appSource).not.toContain('<Route path="/relatorios" component={Relatorios} />');
    expect(appSource).not.toContain('<Route path="/conciliacao" component={Conciliacao} />');
    expect(appSource).toContain('<Route path="/clientes/:id/relatorios" component={ConsultorClientReports} />');
    expect(appSource).toContain('<Route path="/clientes/:id/conciliacao" component={ConsultorClientReconciliation} />');
  });

  it("expõe metas e o painel de alertas dentro da navegação contextual", () => {
    expect(appSource).toContain('<Route path="/metas" component={Metas} />');
    expect(layoutSource).toContain('label: "Minhas metas"');
    expect(layoutSource).toContain('label: "Metas do negócio"');
    expect(layoutSource).toContain('Aportes deste mês');
    expect(layoutSource).toContain('onClick={() => setAlertsOpen((open) => !open)}');
    expect(layoutSource).toContain('role="dialog"');
    expect(layoutSource).not.toContain('label: "Alertas"');
  });

  it("oferece painéis distintos para a operação BPO e a jornada pessoal", () => {
    expect(appSource).toContain('<Route path="/operacao" component={ConsultorOperacao} />');
    expect(appSource).toContain('<Route path="/pessoal" component={Pessoal} />');
    expect(operationSource).toContain('Clientes ativos');
    expect(operationSource).toContain('Recorrentes');
    expect(operationSource).toContain('Inadimplências');
    expect(operationSource).toContain('Cancelamentos');
    expect(personalSource).toContain('Assinaturas de serviços');
    expect(personalSource).toContain('Gastos da semana');
    expect(personalSource).toContain('trpc.subscriptions.create');
    expect(clientSource).toContain('serviceModel: value === "nao-informado" ? null');
  });

  it("mantém a jornada pessoal focada em resumo, contas, movimentações e metas", () => {
    const personalNavigation = layoutSource.slice(layoutSource.indexOf("const personalItems"), layoutSource.indexOf("const businessItems"));
    expect(personalNavigation).toContain('label: "Visão geral"');
    expect(personalNavigation).toContain('label: "Minhas contas"');
    expect(personalNavigation).toContain('label: "Gastos e entradas"');
    expect(personalNavigation).toContain('label: "Minhas metas"');
    expect(personalNavigation).not.toContain("Conciliação");
    expect(personalNavigation).not.toContain("Relatórios financeiros");
    expect(reconciliationSource).toContain('if (!isConsultor)');
    expect(reportsSource).toContain('if (!isConsultor)');
    expect(appSource).toContain('function ConsultorOnly');
    expect(appSource).toContain('component={ConsultorClientes}');
    expect(appSource).toContain('component={ConsultorOperacao}');
    expect(appSource).toContain('component={ConsultorClientDashboard}');
    expect(appSource).toContain('component={ConsultorClientTransactions}');
    expect(appSource).toContain('component={ConsultorClientPayables}');
    expect(appSource).toContain('component={ConsultorClientReceivables}');
    expect(appSource).toContain('component={ConsultorClientNotifications}');
    expect(appSource).toContain('component={ConsultorClientReports}');
    expect(appSource).toContain('component={ConsultorClientGoals}');
    expect(appSource).toContain('component={ConsultorClientMeiWorkflow}');
    expect(appSource).toContain('component={ConsultorClientReconciliation}');
  });

  it("direciona o MEI para uma jornada própria de prazos e obrigações", () => {
    expect(appSource).toContain('<Route path="/mei" component={Mei} />');
    expect(meiSource).toContain('Painel MEI');
    expect(meiSource).toContain('Calendário de prazos');
    expect(meiSource).toContain('trpc.meiWorkflow.get');
    expect(meiSource).toContain('Fluxo empresarial nos últimos 7 dias');
    expect(meiSource).toContain('MonthlyFinancialOverview');
    expect(meiSource).toContain('Baixar DRE em PDF');
  });

  it("prioriza o histórico mensal e o resumo PDF na jornada pessoal", () => {
    expect(personalSource).toContain('MonthlyFinancialOverview');
    expect(personalSource).toContain('Baixar resumo PDF');
    expect(personalSource.indexOf('MonthlyFinancialOverview')).toBeLessThan(personalSource.indexOf('Assinaturas de serviços'));
  });

  it("mostra previsões pessoais como lembretes, sem expor confirmação operacional", () => {
    expect(personalSource).toContain('Próximos compromissos');
    expect(personalSource).toContain('Organizar contas');
    expect(personalSource).not.toContain('Confirmar lançamento');
  });

  it("prioriza o gráfico de caixa antes dos cartões na visão empresarial sem reordenação CSS", () => {
    const businessDashboard = dashboardSource.slice(dashboardSource.indexOf('function BusinessDashboard'), dashboardSource.indexOf('function Agenda'));
    expect(businessDashboard.indexOf('MonthlyFinancialOverview')).toBeLessThan(businessDashboard.indexOf('Fluxo de caixa semanal'));
    expect(businessDashboard.indexOf('Fluxo de caixa semanal')).toBeLessThan(businessDashboard.indexOf('Saldo operacional'));
    expect(stylesSource).not.toContain('.aion-page:has(');
  });

  it("permite ordenar as movimentações por data de forma explícita e acessível", () => {
    expect(transactionsSource).toContain('aria-label="Ordenação por data"');
    expect(transactionsSource).toContain('Mais recentes primeiro');
    expect(transactionsSource).toContain('Mais antigas primeiro');
    expect(transactionsSource).toContain('setDateOrder(value)');
  });

  it("oferece ao consultor seleção de cliente, barra lateral recolhível e menu de perfil", () => {
    expect(layoutSource).toContain('collapsible="icon"');
    expect(layoutSource).toContain('aria-label={sidebarOpen ? "Recolher barra lateral" : "Expandir barra lateral"}');
    expect(layoutSource).toContain('onOpenChange={handleSidebarOpenChange}');
    expect(layoutSource).toContain('writeSidebarPreference(open)');
    expect(layoutSource).toContain('Abrir dashboard de cliente');
    expect(layoutSource).toContain('navigate(`/clientes/${client.id}/dashboard`)');
    expect(layoutSource).toContain('Editar informações');
    expect(layoutSource).toContain('trpc.auth.updateProfile.useMutation');
    expect(layoutSource).toContain('Sair');
  });
});
