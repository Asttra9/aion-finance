import { describe, expect, it } from "vitest";
import { resolveMonthlyReferenceStart } from "../client/src/lib/monthlyReference";

describe("referência mensal dos indicadores", () => {
  it("mantém o mês corrente quando existem movimentações na competência atual", () => {
    const reference = resolveMonthlyReferenceStart(
      [{ date: new Date(2026, 7, 4) }, { date: new Date(2026, 6, 30) }],
      new Date(2026, 7, 21),
    );

    expect(reference.getFullYear()).toBe(2026);
    expect(reference.getMonth()).toBe(7);
  });

  it("usa a competência mais recente para históricos importados sem movimentos no mês atual", () => {
    const reference = resolveMonthlyReferenceStart(
      [{ date: new Date(2022, 11, 1) }, { date: new Date(2023, 2, 6) }],
      new Date(2026, 7, 21),
    );

    expect(reference.getFullYear()).toBe(2023);
    expect(reference.getMonth()).toBe(2);
  });

  it("mantém o mês corrente quando não existem movimentações válidas", () => {
    const reference = resolveMonthlyReferenceStart([{ date: "data-inválida" }], new Date(2026, 7, 21));

    expect(reference.getFullYear()).toBe(2026);
    expect(reference.getMonth()).toBe(7);
  });
});
