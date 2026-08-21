import AionDashboardLayout from "@/components/AionDashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  RefreshCw,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocation } from "wouter";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const chartAxisMoney = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
};

function Metric({ label, value, note, icon: Icon, tone = "default" }: { label: string; value: string; note: string; icon: typeof UsersRound; tone?: "default" | "alert" | "positive" }) {
  const toneClass = tone === "alert" ? "bg-primary/10 text-primary" : tone === "positive" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-secondary text-foreground";
  return <Card className="aion-metric"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-extrabold tracking-[-.045em]">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-5 w-5" /></span></div><p className="mt-3 text-xs font-medium text-muted-foreground">{note}</p></CardContent></Card>;
}

export default function Operacao() {
  const [, navigate] = useLocation();
  const { data: metrics, isLoading } = trpc.consultantMetrics.summary.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const overdueClients = clients.filter(client => metrics?.delinquentClientIds.includes(client.id));
  const onboardingClients = clients.filter(client => client.status === "em_onboarding");
  const priorityClients = overdueClients.length ? overdueClients : onboardingClients;
  const hasTrend = metrics?.monthlyTrend.some(item => item.income || item.expense);
  const projectedNetPositive = (metrics?.projectedNet30 ?? 0) >= 0;

  return <AionDashboardLayout>
    {isLoading || !metrics ? <div className="flex min-h-[52vh] items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div> : <div className="aion-page">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="aion-eyebrow">Operação BPO</p>
          <h2 className="aion-title">Acompanhamento de carteira.</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">Leitura operacional da carteira, com fluxo realizado, compromissos próximos e projeção baseada nos lançamentos cadastrados.</p>
        </div>
        <Button className="min-h-11" onClick={() => navigate("/clientes")}>Ver carteira completa <ArrowUpRight className="ml-1 h-4 w-4" /></Button>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Clientes ativos" value={String(metrics.activeClients)} note={`${metrics.totalClients} cliente(s) na carteira`} icon={UsersRound} tone="positive" />
        <Metric label="Em onboarding" value={String(metrics.onboardingClients)} note="Cadastros em fase de entrada" icon={UserRoundPlus} tone={metrics.onboardingClients ? "default" : "positive"} />
        <Metric label="Atendimentos recorrentes" value={String(metrics.recurringClients)} note="Clientes ativos recorrentes" icon={RefreshCw} />
        <Metric label="Inadimplências" value={String(metrics.delinquentClients)} note={metrics.overdueBalance ? `${money(metrics.overdueBalance)} em atraso` : "Sem valores vencidos"} icon={AlertTriangle} tone={metrics.delinquentClients ? "alert" : "positive"} />
        <Metric label="Resultado projetado · 30 dias" value={money(metrics.projectedNet30)} note={projectedNetPositive ? "Entradas previstas superam as saídas" : "Saídas previstas superam as entradas"} icon={Landmark} tone={projectedNetPositive ? "positive" : "alert"} />
        <Metric label="Vencimentos próximos" value={String(metrics.dueSoonCount)} note={metrics.dueSoonAmount ? `${money(metrics.dueSoonAmount)} nos próximos 7 dias` : "Nenhum prazo pendente nos próximos 7 dias"} icon={CalendarClock} tone={metrics.dueSoonCount ? "alert" : "positive"} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="aion-panel"><CardContent className="p-5 sm:p-6"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-lg font-extrabold tracking-[-.03em]">Tendência financeira da carteira</h3><p className="mt-1 text-sm text-muted-foreground">Entradas e saídas consolidadas por período.</p></div><span className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Realizado</span></div><div className="mt-5 h-[275px]">{hasTrend ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={metrics.monthlyTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="bpoIncome" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.28} /><stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} /></linearGradient><linearGradient id="bpoExpense" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={chartAxisMoney} /><Tooltip formatter={(value: number, name: string) => [money(value), name === "income" ? "Entradas" : "Saídas"]} contentStyle={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--card)" }} /><Area type="monotone" dataKey="income" name="Entradas" stroke="var(--chart-2)" strokeWidth={2.5} fill="url(#bpoIncome)" /><Area type="monotone" dataKey="expense" name="Saídas" stroke="var(--primary)" strokeWidth={2.5} fill="url(#bpoExpense)" /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-xl bg-secondary/60 px-6 text-center text-sm text-muted-foreground">Ainda não há movimentações suficientes para visualizar a tendência consolidada.</div>}</div></CardContent></Card>
        <Card className="aion-panel"><CardContent className="p-5 sm:p-6"><p className="aion-eyebrow">Projeção · 30 dias</p><h3 className="mt-1 text-lg font-extrabold tracking-[-.03em]">Fluxo programado</h3><p className="mt-1 text-sm text-muted-foreground">Baseado em contas pendentes com vencimento no período.</p><div className="mt-6 space-y-4"><div className="rounded-xl bg-emerald-500/8 p-4"><span className="text-xs font-bold uppercase tracking-[.12em] text-emerald-700 dark:text-emerald-300">Entradas previstas</span><p className="mt-2 text-xl font-extrabold">{money(metrics.projectedReceivables30)}</p></div><div className="rounded-xl bg-primary/8 p-4"><span className="text-xs font-bold uppercase tracking-[.12em] text-primary">Saídas previstas</span><p className="mt-2 text-xl font-extrabold">{money(metrics.projectedPayables30)}</p></div><div className="flex items-center justify-between border-t border-border pt-4"><span className="text-sm font-bold">Saldo projetado</span><span className={`text-lg font-extrabold ${projectedNetPositive ? "text-emerald-700 dark:text-emerald-300" : "text-primary"}`}>{money(metrics.projectedNet30)}</span></div></div></CardContent></Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="aion-panel"><CardContent className="p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><h3 className="text-lg font-extrabold tracking-[-.03em]">Prioridades da carteira</h3><p className="mt-1 text-sm text-muted-foreground">Clientes que exigem acompanhamento agora.</p></div><Button variant="outline" size="sm" onClick={() => navigate("/clientes")}>Ver todos</Button></div><div className="mt-5 space-y-3">{priorityClients.slice(0, 5).map(client => <button key={client.id} onClick={() => navigate(`/clientes/${client.id}/dashboard`)} className="flex min-h-16 w-full items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 text-left transition hover:border-primary/45 hover:bg-accent/40"><span className="min-w-0"><span className="block truncate font-extrabold">{client.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{overdueClients.some(item => item.id === client.id) ? "Há valores vencidos associados" : "Cadastro em onboarding"}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-primary" /></button>)}{!priorityClients.length && <div className="rounded-xl bg-secondary/60 px-4 py-5 text-sm text-muted-foreground">Não há pendências críticas ou onboardings em aberto neste momento.</div>}</div></CardContent></Card>
        <Card className="aion-panel"><CardContent className="p-5 sm:p-6"><p className="aion-eyebrow">Ritmo operacional</p><h3 className="mt-1 text-lg font-extrabold tracking-[-.03em]">Leitura para a semana</h3><div className="mt-5 space-y-4"><div className="flex items-start gap-3 rounded-xl bg-secondary/60 p-4"><CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p className="text-sm text-muted-foreground">{metrics.dueSoonCount ? `${metrics.dueSoonCount} compromisso(s) pendente(s) somam ${money(metrics.dueSoonAmount)} nos próximos 7 dias.` : "Não há vencimentos pendentes nos próximos 7 dias."}</p></div><div className="flex items-start gap-3 rounded-xl bg-secondary/60 p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" /><p className="text-sm text-muted-foreground">{metrics.delinquentClients ? `${metrics.delinquentClients} cliente(s) concentram ${money(metrics.overdueBalance)} em valores vencidos.` : "A carteira não possui valores vencidos registrados."}</p></div></div></CardContent></Card>
      </section>
    </div>}
  </AionDashboardLayout>;
}
