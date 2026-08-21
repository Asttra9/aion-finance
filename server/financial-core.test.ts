import { describe, expect, it } from "vitest";
import { calculateMonthlySummary, filterEntriesByMonth } from "./financialCalculations";
import { isValidOFX, parseOFX } from "./ofxParser";
import { buildFinancialReportPdf } from "./reportPdf";
import { parseMercadoPagoCSV } from "./mercadoPagoParser";
import { isValidMoney, parseMoney, toDecimal } from "./financialValues";

describe("financialCalculations", () => {
  it("calcula totais, margem, categorias e ponto de equilíbrio", () => {
    const summary = calculateMonthlySummary([
      { date: new Date(2026, 7, 1), description: "Serviço", amount: "10000", type: "receita", category: "Serviços" },
      { date: new Date(2026, 7, 2), description: "Aluguel", amount: 2000, type: "despesa", category: "Aluguel fixo", isFixedCost: true },
      { date: new Date(2026, 7, 3), description: "Taxas", amount: 1000, type: "despesa", category: "Taxas" },
    ]);
    expect(summary.totalIncome).toBe(10000);
    expect(summary.totalExpense).toBe(3000);
    expect(summary.netCashFlow).toBe(7000);
    expect(summary.grossMargin).toBe(70);
    expect(summary.breakEvenPoint).toBeCloseTo(2222.2222, 3);
    expect(summary.expenseByCategory[0]).toEqual({ category: "Aluguel fixo", amount: 2000 });
  });

  it("filtra lançamentos pelo mês civil", () => {
    const entries = [{ date: new Date(2026, 7, 1) }, { date: new Date(2026, 8, 1) }];
    expect(filterEntriesByMonth(entries, 2026, 8)).toHaveLength(1);
  });

  it("não presume custo fixo pelo nome da categoria", () => {
    const summary = calculateMonthlySummary([
      { date: new Date(2026, 7, 1), description: "Serviço", amount: 10000, type: "receita" },
      { date: new Date(2026, 7, 2), description: "Aluguel", amount: 2000, type: "despesa", category: "Aluguel fixo", isFixedCost: false },
    ]);
    expect(summary.breakEvenPoint).toBe(0);
  });
});

describe("financialValues", () => {
  it("normaliza valores brasileiros com precisão de centavos", () => {
    expect(parseMoney("1.234,567")).toBe(1234.57);
    expect(toDecimal("89,9")).toBe("89.90");
    expect(isValidMoney("-10")).toBe(false);
    expect(isValidMoney("invalido")).toBe(false);
  });
});

describe("ofxParser", () => {
  const ofx = `<?xml version="1.0"?><OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><BANKID>001</BANKID><ACCTID>123</ACCTID></BANKACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260801</DTPOSTED><TRNAMT>1500.25</TRNAMT><FITID>A1</FITID><NAME>Cliente</NAME><MEMO>Pagamento</MEMO></STMTTRN><STMTTRN><DTPOSTED>20260802</DTPOSTED><TRNAMT>-200.00</TRNAMT><FITID>A2</FITID><NAME>Aluguel</NAME></STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

  it("valida e interpreta receitas e despesas", () => {
    expect(isValidOFX(ofx)).toBe(true);
    const result = parseOFX(ofx);
    expect(result.errors).toEqual([]);
    expect(result.bankCode).toBe("001");
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({ description: "Cliente - Pagamento", amount: 1500.25, type: "receita", ofxId: "A1" });
    expect(result.transactions[1]).toMatchObject({ description: "Aluguel", amount: 200, type: "despesa", ofxId: "A2" });
  });

  it("retorna erro para um OFX sem lista bancária", () => {
    const result = parseOFX("<OFX><STMTRS></STMTRS></OFX>");
    expect(result.transactions).toEqual([]);
    expect(result.errors).toContain("Nenhuma lista de transações encontrada");
  });
});

describe("mercadoPagoParser", () => {
  it("interpreta cabeçalhos oficiais latin-1 com venda, tarifa e devolução", () => {
    const csv = [
      "Data_criação;Tipo;Conta;Descrição;Valor_bruto;Taxa;Valor_líquido;ID da operação;ID da operação relacionada",
      "01/08/2026;Venda;Conta principal;Pedido 104;100,00;10,00;90,00;VENDA-104;",
      "01/08/2026;Tarifa;Conta principal;Tarifa Pedido 104;0,00;10,00;0,00;TARIFA-104;",
      "02/08/2026;Devolução;Conta principal;Devolução Pedido 104;90,00;0,00;90,00;DEV-104;VENDA-104",
    ].join("\n");
    const result = parseMercadoPagoCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.transactions).toHaveLength(3);
    expect(result.transactions[0]).toMatchObject({ type: "receita", amount: 90, operationId: "VENDA-104", kind: "transaction" });
    expect(result.transactions[1]).toMatchObject({ type: "despesa", amount: 10, operationId: "TARIFA-104", kind: "transaction" });
    expect(result.transactions[2]).toMatchObject({ kind: "refund", relatedOperationId: "VENDA-104" });
  });
});

describe("reportPdf", () => {
  it("gera relatório para mais categorias que as visíveis na primeira página", async () => {
    const transactions = [
      { date: new Date(2026, 7, 1), description: "Receita", amount: 10000, type: "receita" as const, category: "Serviços" },
      ...Array.from({ length: 12 }, (_, index) => ({ date: new Date(2026, 7, 2), description: `Despesa ${index}`, amount: 100, type: "despesa" as const, category: `Categoria ${index}` })),
    ];
    const pdf = await buildFinancialReportPdf({ clientName: "Cliente de teste", month: 8, year: 2026, reportType: "fluxo_caixa", transactions });
    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.byteLength).toBeGreaterThan(500);
  });
});
