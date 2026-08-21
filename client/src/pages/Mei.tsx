import AionDashboardLayout from "@/components/AionDashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MonthlyFinancialOverview from "@/components/MonthlyFinancialOverview";
import FinancialPdfButton from "@/components/FinancialPdfButton";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, BarChart3, CalendarDays, CheckCircle2, Landmark, ReceiptText } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocation } from "wouter";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numeric = (value: string | number) => Number(value) || 0;
const dateLabel = (value: Date | string) => new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

function Metric({ label, value, note, icon: Icon, alert = false }: { label: string; value: string; note: string; icon: typeof Landmark; alert?: boolean }) {
  return (
    <Card className="aion-metric"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-extrabold tracking-[-.045em]">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${alert ? "bg-[#f9e8eb] text-primary" : "bg-[#f0e7e3] text-primary"}`}><Icon className="h-5 w-5" /></span></div><p className="mt-3 text-xs font-medium text-muted-foreground">{note}</p></CardContent></Card>
  );
}

export default function Mei() {
  const [, navigate] = useLocation();
  const { data: client, isLoading: clientLoading } = trpc.clients.me.useQuery();
  const clientId = client?.id ?? 0;
  const { data: transactions = [], isLoading: transactionsLoading } = trpc.transactions.list.useQuery({ clientId, limit: 100 }, { enabled: !!clientId });
  const { data: categories = [] } = trpc.transactions.categoriesForClient.useQuery({ clientId }, { enabled: !!clientId });
  const { data: payables = [] } = trpc.accountsPayable.list.useQuery({ clientId }, { enabled: !!clientId });
  const { data: recurringOccurrences = [] } = trpc.recurringTransactions.occurrences.useQuery({ clientId }, { enabled: !!clientId });
  const { data: workflow } = trpc.meiWorkflow.get.useQuery({ clientId }, { enabled: !!clientId });

  const overview = useMemo(() => {
    const source = transactions.filter((transaction) => transaction.financeType === "empresarial");
    const income = source.filter((transaction) => transaction.type === "receita").reduce((total, transaction) => total + numeric(transaction.amount), 0);
    const expense = source.filter((transaction) => transaction.type === "despesa").reduce((total, transaction) => total + numeric(transaction.amount), 0);
    const deadlines = payables.filter((account) => account.status === "pendente" || account.status === "vencido").sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
    const overdue = deadlines.filter((account) => account.status === "vencido");
    const graph = Array.from({ length: 7 }, (_, index) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (6 - index));
      const matching = source.filter((transaction) => {
        const date = new Date(transaction.date);
        return date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate();
      });
      return {
        day: day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        entradas: matching.filter((transaction) => transaction.type === "receita").reduce((total, transaction) => total + numeric(transaction.amount), 0),
        saidas: matching.filter((transaction) => transaction.type === "despesa").reduce((total, transaction) => total + numeric(transaction.amount), 0),
      };
    });
    return { income, expense, deadlines, overdue, graph };
  }, [payables, transactions]);
  const upcomingRecurring = recurringOccurrences
    .filter((item) => item.occurrence.status === "previsto" && item.rule.financeType === "empresarial")
    .sort((left, right) => +new Date(left.occurrence.scheduledDate) - +new Date(right.occurrence.scheduledDate))
    .slice(0, 4);
  const completedSteps = Array.isArray(workflow?.steps) ? workflow.steps.filter((step: { completed: boolean }) => step.completed).length : 0;

  if (clientLoading || (clientId && transactionsLoading)) return <AionDashboardLayout><div className="flex min-h-[52vh] items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div></AionDashboardLayout>;
  if (!client || client.businessType !== "mei") return <AionDashboardLayout><div className="aion-page"><p className="text-muted-foreground">Esta jornada está disponível para perfis MEI.</p></div></AionDashboardLayout>;

  return (
    <AionDashboardLayout>
      <div className="aion-page">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="aion-eyebrow">Painel MEI</p><h2 className="aion-title">Prazos e caixa do seu MEI.</h2><p className="mt-2 max-w-2xl text-muted-foreground">Acompanhe obrigações registradas, fluxo recente e etapas operacionais do seu negócio.</p></div><div className="flex flex-wrap gap-2"><FinancialPdfButton clientId={clientId} reportType="dre" label="Baixar DRE em PDF"/><Button variant="outline" className="min-h-11 border-primary/30 text-primary hover:bg-accent" onClick={() => navigate("/mei-workflow")}>Jornada MEI</Button></div></section>
        <MonthlyFinancialOverview transactions={transactions} categories={categories} financeType="empresarial" />
        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Saldo do período" value={money(overview.income - overview.expense)} note="Entradas menos saídas empresariais" icon={Landmark}/><Metric label="Obrigações abertas" value={String(overview.deadlines.length)} note="Contas pendentes ou vencidas" icon={ReceiptText} alert={overview.deadlines.length > 0}/><Metric label="Em atraso" value={String(overview.overdue.length)} note="Prazos que exigem regularização" icon={AlertTriangle} alert={overview.overdue.length > 0}/><Metric label="Jornada MEI" value={`${completedSteps}/8`} note="Etapas concluídas no workflow" icon={CheckCircle2}/></section>
        <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <Card className="aion-panel"><CardContent className="p-5 sm:p-6"><h3 className="text-lg font-extrabold tracking-[-.03em]">Fluxo empresarial nos últimos 7 dias</h3><p className="mt-1 text-sm text-muted-foreground">Leitura interativa das entradas e saídas já registradas.</p><div className="mt-5"><ResponsiveContainer width="100%" height={270}><BarChart data={overview.graph}><CartesianGrid vertical={false} stroke="#e5dfda"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#716a67", fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#716a67", fontSize: 12 }}/><Tooltip formatter={(chartValue: number) => money(chartValue)} contentStyle={{ borderRadius: 14, border: "1px solid #e5dfda" }}/><Bar dataKey="entradas" name="Entradas" fill="#b21d31" radius={[6, 6, 0, 0]}/><Bar dataKey="saidas" name="Saídas" fill="#363636" radius={[6, 6, 0, 0]}/></BarChart></ResponsiveContainer></div></CardContent></Card>
          <Card className="aion-panel"><CardContent className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold tracking-[-.03em]">Calendário de prazos</h3><p className="mt-1 text-sm text-muted-foreground">Pagamentos e obrigações, incluindo DAS quando identificado.</p></div><CalendarDays className="h-5 w-5 text-primary"/></div><div className="mt-5 space-y-3">{overview.deadlines.slice(0, 5).map((account) => { const isDas = /\bdas\b/i.test(`${account.description} ${account.category ?? ""}`); return <div key={account.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/65 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{account.description}</p><p className={`mt-0.5 text-xs font-bold ${account.status === "vencido" ? "text-primary" : "text-muted-foreground"}`}>{account.status === "vencido" ? "Em atraso" : `Vence ${dateLabel(account.dueDate)}`}{isDas ? " · DAS" : ""}</p></div><span className="shrink-0 font-extrabold">{money(numeric(account.amount))}</span></div>; })}{!overview.deadlines.length && <p className="rounded-xl bg-secondary/55 px-4 py-5 text-sm text-muted-foreground">Não há prazos financeiros cadastrados.</p>}</div><Button variant="ghost" className="mt-4 min-h-10 px-0 text-primary hover:bg-transparent hover:text-primary" onClick={() => navigate("/contas-pagar")}>Organizar prazos</Button></CardContent></Card>
        </section>
        <section className="mt-5"><Card className="aion-panel"><CardContent className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold tracking-[-.03em]">Compromissos recorrentes</h3><p className="mt-1 text-sm text-muted-foreground">Previsões de custos mensais e anuais; entram no caixa somente após a confirmação da Aion.</p></div><CalendarDays className="h-5 w-5 text-primary" /></div><div className="mt-5 grid gap-3 md:grid-cols-2">{upcomingRecurring.map(({ occurrence, rule }) => <div key={occurrence.id} className="rounded-xl bg-secondary/60 px-4 py-3"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-extrabold">{rule.description}</p><span className="shrink-0 text-sm font-extrabold">{money(numeric(rule.amount))}</span></div><p className="mt-1 text-xs text-muted-foreground">Previsto para {dateLabel(occurrence.scheduledDate)}</p></div>)}{!upcomingRecurring.length && <p className="rounded-xl bg-secondary/55 px-4 py-5 text-sm text-muted-foreground md:col-span-2">Não há compromissos recorrentes previstos para este negócio.</p>}</div><Button variant="ghost" className="mt-4 min-h-10 px-0 text-primary hover:bg-transparent hover:text-primary" onClick={() => navigate("/contas-pagar")}>Ver contas e previsões</Button></CardContent></Card></section>
        <section className="mt-5"><Card className="aion-panel"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h3 className="text-lg font-extrabold tracking-[-.03em]">Obrigações operacionais</h3><p className="mt-1 text-sm text-muted-foreground">Mantenha o workflow MEI atualizado para acompanhar documentação e regularização.</p></div><Button onClick={() => navigate("/mei-workflow")}><BarChart3 className="mr-2 h-4 w-4"/>Abrir jornada</Button></CardContent></Card></section>
      </div>
    </AionDashboardLayout>
  );
}
