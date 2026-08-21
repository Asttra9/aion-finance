export type FinancialDatedEntry = {
  date: Date | string;
};

function toValidDate(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Mantém o mês corrente quando há movimentos nele. Para históricos importados,
 * usa a competência mais recente para que indicadores não apareçam vazios.
 */
export function resolveMonthlyReferenceStart<T extends FinancialDatedEntry>(entries: T[], now = new Date()) {
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const hasCurrentActivity = entries.some((entry) => {
    const date = toValidDate(entry.date);
    return date && date >= currentStart && date < nextStart;
  });

  if (hasCurrentActivity) return currentStart;

  const latest = entries.reduce<Date | undefined>((latestDate, entry) => {
    const date = toValidDate(entry.date);
    if (!date || (latestDate && date <= latestDate)) return latestDate;
    return date;
  }, undefined);

  return latest ? new Date(latest.getFullYear(), latest.getMonth(), 1) : currentStart;
}

export function formatMonthlyReference(start: Date) {
  return `Referência: ${start.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "")}`;
}
