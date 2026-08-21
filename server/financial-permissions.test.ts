import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { buildFinancialReportPdf } from "./reportPdf";
import type { TrpcContext } from "./_core/context";

describe("financial reports", () => {
  it("gera um PDF consultivo real com assinatura PDF", async () => {
    const pdf = await buildFinancialReportPdf({
      clientName: "Cliente Aion",
      businessName: "Ateliê Exemplo",
      month: 8,
      year: 2026,
      reportType: "dre",
      transactions: [
        { date: new Date(2026, 7, 2), description: "Serviço", amount: "3500", type: "receita", category: "Serviços" },
        { date: new Date(2026, 7, 3), description: "Aluguel", amount: "1200", type: "despesa", category: "Aluguel fixo" },
      ],
    });
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });
});

describe("financial permissions", () => {
  it("impede que um Cliente acesse a listagem global de clientes", async () => {
    const ctx = {
      user: {
        id: 7,
        openId: "client-user",
        name: "Cliente",
        email: "cliente@example.com",
        loginMethod: "manus",
        role: "cliente",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} },
      res: { clearCookie: () => undefined },
    } as unknown as TrpcContext;

    const caller = appRouter.createCaller(ctx);
    await expect(caller.clients.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
