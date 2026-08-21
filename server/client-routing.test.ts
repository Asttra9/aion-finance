import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const appSource = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");
const layoutSource = readFileSync(resolve(projectRoot, "client/src/components/AionDashboardLayout.tsx"), "utf8");

describe("roteamento contextual da Aion", () => {
  it("mantém a carteira de clientes registrada para o consultor", () => {
    expect(appSource).toContain('<Route path="/clientes" component={Clientes} />');
    expect(appSource).toContain('<Route path="/clientes/:id/metas" component={Metas} />');
  });

  it("encaminha a rota raiz do consultor para a carteira, sem mostrar seu dashboard", () => {
    expect(appSource).toContain('navigate(isConsultor ? "/clientes" : "/dashboard")');
    expect(appSource).toContain('<Route path="/" component={AuthenticatedRoot} />');
  });

  it("expõe metas e o painel de alertas dentro da navegação contextual", () => {
    expect(appSource).toContain('<Route path="/metas" component={Metas} />');
    expect(layoutSource).toContain('label: "Minhas metas"');
    expect(layoutSource).toContain('label: "Metas do negócio"');
    expect(layoutSource).toContain('Aportes deste mês');
    expect(layoutSource).toContain('onClick={() => setAlertsOpen((open) => !open)}');
    expect(layoutSource).toContain('role="dialog"');
  });
});
