import { describe, expect, it } from "vitest";
import { calculateMonthlySummary, filterEntriesByMonth } from "./financialCalculations";
import { isValidOFX, parseOFX } from "./ofxParser";

describe("financialCalculations", () => {
  it("calcula totais, margem, categorias e ponto de equilíbrio", () => {
    const summary = calculateMonthlySummary([
      { date: new Date(2026, 7, 1), description: "Serviço", amount: "10000", type: "receita", category: "Serviços" },
      { date: new Date(2026, 7, 2), description: "Aluguel", amount: 2000, type: "despesa", category: "Aluguel fixo" },
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
