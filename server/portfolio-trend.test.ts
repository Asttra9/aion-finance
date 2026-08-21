import { describe, expect, it } from "vitest";
import { buildPortfolioMonthlyTrend } from "./portfolioTrend";

describe("tendência consolidada da carteira", () => {
  it("usa o último período com movimentações quando o mês corrente está vazio", () => {
    const trend = buildPortfolioMonthlyTrend(
      [
        { date: new Date(2022, 11, 10), amount: 200, type: "receita" },
        { date: new Date(2023, 2, 6), amount: 850, type: "receita" },
        { date: new Date(2023, 2, 12), amount: 420, type: "despesa" },
      ],
      new Date(2026, 7, 21),
    );

    expect(trend).toHaveLength(6);
    expect(trend.at(-1)).toMatchObject({ income: 850, expense: 420, result: 430 });
  });

  it("usa o mês corrente como referência quando não há movimentações válidas", () => {
    const trend = buildPortfolioMonthlyTrend(
      [{ date: "inválida", amount: 10, type: "receita" }],
      new Date(2026, 7, 21),
    );

    expect(trend.at(-1)?.period).toContain("ago");
  });
});
