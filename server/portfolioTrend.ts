export type PortfolioTrendEntry = {
  date: Date | string;
  amount: number | string | null;
  type: string;
};

export type PortfolioTrendPoint = {
  period: string;
  income: number;
  expense: number;
  result: number;
};

export function buildPortfolioMonthlyTrend(
  entries: PortfolioTrendEntry[],
  referenceDate = new Date(),
): PortfolioTrendPoint[] {
  const validEntries = entries
    .map((entry) => ({ ...entry, date: new Date(entry.date) }))
    .filter((entry) => !Number.isNaN(entry.date.getTime()));
  const anchor = validEntries.reduce<Date>(
    (latest, entry) => (entry.date > latest ? entry.date : latest),
    new Date(referenceDate),
  );
  const latestEntry = validEntries.reduce<Date | null>(
    (latest, entry) => (!latest || entry.date > latest ? entry.date : latest),
    null,
  );
  const effectiveAnchor = latestEntry ?? anchor;
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  });

  return Array.from({ length: 6 }, (_, index) => {
    const month = new Date(
      effectiveAnchor.getFullYear(),
      effectiveAnchor.getMonth() - (5 - index),
      1,
    );
    const monthEntries = validEntries.filter(
      (entry) =>
        entry.date.getFullYear() === month.getFullYear() &&
        entry.date.getMonth() === month.getMonth(),
    );
    const income = monthEntries
      .filter((entry) => entry.type === "receita")
      .reduce((total, entry) => total + Number(entry.amount || 0), 0);
    const expense = monthEntries
      .filter((entry) => entry.type === "despesa")
      .reduce((total, entry) => total + Number(entry.amount || 0), 0);
    return {
      period: formatter.format(month).replace(".", ""),
      income,
      expense,
      result: income - expense,
    };
  });
}
