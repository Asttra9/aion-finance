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

describe("roteamento contextual da Aion", () => {
  it("mantém a carteira de clientes registrada para o consultor", () => {
    expect(appSource).toContain('<Route path="/clientes" component={Clientes} />');
    expect(appSource).toContain('<Route path="/clientes/:id/metas" component={Metas} />');
  });

  it("encaminha a rota raiz para a visão contextual e não expõe relatórios globais", () => {
    expect(appSource).toContain('navigate("/dashboard")');
    expect(appSource).toContain('<Route path="/" component={AuthenticatedRoot} />');
    expect(appSource).not.toContain('<Route path="/relatorios" component={Relatorios} />');
    expect(appSource).not.toContain('<Route path="/conciliacao" component={Conciliacao} />');
    expect(appSource).toContain('<Route path="/clientes/:id/relatorios" component={Relatorios} />');
    expect(appSource).toContain('<Route path="/clientes/:id/conciliacao" component={Conciliacao} />');
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
    expect(appSource).toContain('<Route path="/operacao" component={Operacao} />');
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

  it("direciona o MEI para uma jornada própria de prazos e obrigações", () => {
    expect(appSource).toContain('<Route path="/mei" component={Mei} />');
    expect(meiSource).toContain('Painel MEI');
    expect(meiSource).toContain('Calendário de prazos');
    expect(meiSource).toContain('trpc.meiWorkflow.get');
    expect(meiSource).toContain('Fluxo empresarial nos últimos 7 dias');
  });
});
