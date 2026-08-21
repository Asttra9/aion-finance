export type FinancialEntry = {
  date: Date;
  description: string;
  amount: string | number;
  type: "receita" | "despesa";
  category?: string | null;
};

export type MonthlyFinancialSummary = {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  grossMargin: number;
  breakEvenPoint: number;
  incomeByCategory: Array<{ category: string; amount: number }>;
  expenseByCategory: Array<{ category: string; amount: number }>;
};

function toNumber(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateMonthlySummary(
  transactions: FinancialEntry[],
): MonthlyFinancialSummary {
  const income = transactions.filter((item) => item.type === "receita");
  const expense = transactions.filter((item) => item.type === "despesa");
  const totalIncome = income.reduce((sum, item) => sum + Math.abs(toNumber(item.amount)), 0);
  const totalExpense = expense.reduce((sum, item) => sum + Math.abs(toNumber(item.amount)), 0);
  const netCashFlow = totalIncome - totalExpense;
  const grossMargin = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

  const fixedExpenses = expense.reduce((sum, item) => {
    const category = (item.category ?? "").toLowerCase();
    return sum + (category.includes("fix") || category.includes("aluguel") || category.includes("salário") ? Math.abs(toNumber(item.amount)) : 0);
  }, 0);
  const variableExpenseRate = totalIncome > 0 ? Math.max(0, totalExpense - fixedExpenses) / totalIncome : 0;
  const breakEvenPoint = variableExpenseRate < 1 ? fixedExpenses / (1 - variableExpenseRate) : 0;

  const groupByCategory = (items: FinancialEntry[]) => {
    const grouped = new Map<string, number>();
    for (const item of items) {
      const category = item.category?.trim() || "Sem categoria";
      grouped.set(category, (grouped.get(category) ?? 0) + Math.abs(toNumber(item.amount)));
    }
    return Array.from(grouped.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  return {
    totalIncome,
    totalExpense,
    netCashFlow,
    grossMargin,
    breakEvenPoint,
    incomeByCategory: groupByCategory(income),
    expenseByCategory: groupByCategory(expense),
  };
}

export function filterEntriesByMonth<T extends { date: Date }>(entries: T[], year: number, month: number) {
  return entries.filter((entry) => {
    const date = new Date(entry.date);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
