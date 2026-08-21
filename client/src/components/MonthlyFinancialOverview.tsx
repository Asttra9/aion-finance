import { Card, CardContent } from "@/components/ui/card";
import { formatMonthlyReference, resolveMonthlyReferenceStart } from "@/lib/monthlyReference";
import { ArrowDownRight, ArrowUpRight, ChartNoAxesCombined, Landmark, Percent, ReceiptText } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type FinancialTransaction = {
  categoryId?: number | null;
  date: Date | string;
  amount: string | number;
  type: "receita" | "despesa";
  financeType: "pessoal" | "empresarial";
};

type Props = {
  transactions: FinancialTransaction[];
  financeType: "pessoal" | "empresarial";
  categories?: Array<{ id: number; isFixedCost: boolean }>;
};

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const toAmount = (value: string | number) => Number(value) || 0;

function periodTotal(transactions: FinancialTransaction[], start: Date, end: Date, type: "receita" | "despesa") {
  return transactions.filter((item) => {
    const date = new Date(item.date);
    return item.type === type && date >= start && date < end;
  }).reduce((total, item) => total + toAmount(item.amount), 0);
}

function comparisonText(current: number, previous: number, positiveIsGood: boolean) {
  if (!previous) return current ? "Sem histórico comparável" : "Sem movimentação no período";
  const percentage = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (!percentage) return "Igual ao mês anterior";
  const direction = percentage > 0 ? "acima" : "abaixo";
  const good = positiveIsGood ? percentage > 0 : percentage < 0;
  return `${Math.abs(percentage)}% ${direction} do mês anterior${good ? " · favorável" : ""}`;
}

export default function MonthlyFinancialOverview({ transactions, financeType, categories = [] }: Props) {
  const overview = useMemo(() => {
    const source = transactions.filter((transaction) => transaction.financeType === financeType);
    const fixedCategoryIds = new Set(categories.filter((category) => category.isFixedCost).map((category) => category.id));
    const currentStart = resolveMonthlyReferenceStart(source);
    const nextStart = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1);
    const previousStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
    const income = periodTotal(source, currentStart, nextStart, "receita");
    const expense = periodTotal(source, currentStart, nextStart, "despesa");
    const fixedExpense = periodTotal(source.filter((transaction) => Boolean(transaction.categoryId && fixedCategoryIds.has(transaction.categoryId))), currentStart, nextStart, "despesa");
    const previousIncome = periodTotal(source, previousStart, currentStart, "receita");
    const previousExpense = periodTotal(source, previousStart, currentStart, "despesa");
    const result = income - expense;
    const previousResult = previousIncome - previousExpense;
    const points = Array.from({ length: 6 }, (_, offset) => {
      const monthOffset = 5 - offset;
      const start = new Date(currentStart.getFullYear(), currentStart.getMonth() - monthOffset, 1);
      const end = new Date(currentStart.getFullYear(), currentStart.getMonth() - monthOffset + 1, 1);
      const monthIncome = periodTotal(source, start, end, "receita");
      const monthExpense = periodTotal(source, start, end, "despesa");
      return {
        label: start.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        entradas: monthIncome,
        saídas: monthExpense,
        saldo: monthIncome - monthExpense,
      };
    });
    return { income, expense, fixedExpense, previousIncome, previousExpense, result, previousResult, margin: income ? (result / income) * 100 : 0, points, referenceLabel: formatMonthlyReference(currentStart) };
  }, [categories, financeType, transactions]);

  const business = financeType === "empresarial";
  const indicators = business
    ? [
        { label: "Receitas do mês", value: overview.income, note: comparisonText(overview.income, overview.previousIncome, true), icon: ArrowUpRight, tone: "positive" },
        { label: "Despesas do mês", value: overview.expense, note: comparisonText(overview.expense, overview.previousExpense, false), icon: ArrowDownRight, tone: "negative" },
        { label: "Resultado líquido", value: overview.result, note: comparisonText(overview.result, overview.previousResult, true), icon: Landmark, tone: overview.result >= 0 ? "positive" : "negative" },
        { label: "Margem líquida", value: overview.margin, note: overview.income ? "Resultado líquido sobre as receitas" : "Registre receitas para calcular", icon: Percent, tone: overview.margin >= 0 ? "positive" : "negative", percentage: true },
        { label: "Custos fixos", value: overview.fixedExpense, note: overview.fixedExpense ? "Despesas classificadas como custo fixo" : "Classifique categorias fixas para acompanhar", icon: ReceiptText, tone: "negative" },
      ]
    : [
        { label: "Entradas no mês", value: overview.income, note: comparisonText(overview.income, overview.previousIncome, true), icon: ArrowUpRight, tone: "positive" },
        { label: "Gastos no mês", value: overview.expense, note: comparisonText(overview.expense, overview.previousExpense, false), icon: ArrowDownRight, tone: "negative" },
        { label: "Saldo do mês", value: overview.result, note: comparisonText(overview.result, overview.previousResult, true), icon: Landmark, tone: overview.result >= 0 ? "positive" : "negative" },
      ];

  return <section className="mt-7 space-y-5">
    <Card className="aion-panel overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="aion-eyebrow">Histórico financeiro</p><h3 className="mt-1 text-xl font-extrabold tracking-[-.035em]">Evolução do mês</h3><p className="mt-1 text-sm text-muted-foreground">Entradas, saídas e saldo dos últimos seis meses.</p></div>
          <span className="flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground"><ChartNoAxesCombined className="h-3.5 w-3.5 text-primary" />{overview.referenceLabel}</span>
        </div>
        <div className="mt-5 h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={overview.points} margin={{ left: -12, right: 8 }}>
              <defs><linearGradient id={`aion-monthly-${financeType}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#b21d31" stopOpacity={0.3}/><stop offset="100%" stopColor="#b21d31" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.75}/>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}/>
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}/>
              <Tooltip formatter={(value: number) => money(value)} contentStyle={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--card)", color: "var(--card-foreground)" }}/>
              <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#b21d31" strokeWidth={3} fill={`url(#aion-monthly-${financeType})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
    <div className={`grid gap-4 ${business ? "sm:grid-cols-2 xl:grid-cols-5" : "sm:grid-cols-3"}`}>
      {indicators.map(({ label, value, note, icon: Icon, tone, percentage }) => <Card key={label} className="aion-metric"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-extrabold tracking-[-.045em]">{percentage ? `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : money(value)}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === "positive" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" /></span></div><p className="mt-3 text-xs font-medium text-muted-foreground">{note}</p></CardContent></Card>)}
    </div>
  </section>;
}
