import AionDashboardLayout from "@/components/AionDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, RefreshCw, UsersRound } from "lucide-react";
import { useLocation } from "wouter";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Metric({ label, value, note, icon: Icon, tone = "default" }: { label: string; value: string; note: string; icon: typeof UsersRound; tone?: "default" | "alert" | "positive" }) {
  const toneClass = tone === "alert" ? "bg-[#f9e8eb] text-primary" : tone === "positive" ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-foreground";
  return <Card className="aion-metric"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-extrabold tracking-[-.045em]">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-5 w-5" /></span></div><p className="mt-3 text-xs font-medium text-muted-foreground">{note}</p></CardContent></Card>;
}

export default function Operacao() {
  const [, navigate] = useLocation();
  const { data: metrics, isLoading } = trpc.consultantMetrics.summary.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const overdueClients = clients.filter((client) => metrics?.delinquentClientIds.includes(client.id));

  return <AionDashboardLayout>
    {isLoading || !metrics ? <div className="flex min-h-[52vh] items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div> : <div className="aion-page">
      <section><p className="aion-eyebrow">Operação BPO</p><h2 className="aion-title">Acompanhamento da carteira.</h2><p className="mt-2 max-w-2xl text-muted-foreground">Uma leitura operacional da base sob gestão. Os indicadores refletem somente classificações e lançamentos já registrados na Aion.</p></section>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Clientes ativos" value={String(metrics.activeClients)} note="Carteira em acompanhamento" icon={UsersRound} tone="positive"/><Metric label="Recorrentes" value={String(metrics.recurringClients)} note="Atendimentos marcados como recorrentes" icon={RefreshCw}/><Metric label="Inadimplências" value={String(metrics.delinquentClients)} note={metrics.overdueBalance ? `${money(metrics.overdueBalance)} em atraso` : "Sem valores vencidos"} icon={AlertTriangle} tone={metrics.delinquentClients ? "alert" : "positive"}/><Metric label="Cancelamentos" value={String(metrics.cancelledClients)} note="Clientes marcados como inativos" icon={CheckCircle2} tone={metrics.cancelledClients ? "alert" : "default"}/></section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><Card className="aion-panel"><CardContent className="p-5 sm:p-6"><h3 className="text-lg font-extrabold tracking-[-.03em]">Clientes que pedem atenção</h3><p className="mt-1 text-sm text-muted-foreground">A carteira com lançamentos vencidos, priorizada para a rotina de acompanhamento.</p><div className="mt-5 space-y-3">{overdueClients.map((client) => <button key={client.id} onClick={() => navigate(`/clientes/${client.id}/dashboard`)} className="flex min-h-15 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-left hover:border-primary/45 hover:bg-accent/40"><span><span className="block font-extrabold">{client.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">Há contas vencidas associadas</span></span><span className="text-sm font-extrabold text-primary">Abrir</span></button>)}{!overdueClients.length && <p className="rounded-xl bg-secondary/60 px-4 py-5 text-sm text-muted-foreground">Nenhum cliente apresenta valores vencidos no momento.</p>}</div></CardContent></Card><Card className="aion-panel"><CardContent className="p-5 sm:p-6"><h3 className="text-lg font-extrabold tracking-[-.03em]">Critérios do relatório</h3><div className="mt-5 space-y-4 text-sm text-muted-foreground"><p><strong className="text-foreground">Recorrentes:</strong> clientes ativos explicitamente classificados como recorrentes no cadastro.</p><p><strong className="text-foreground">Inadimplências:</strong> clientes com contas a pagar ou receber em status vencido.</p><p><strong className="text-foreground">Cancelamentos:</strong> clientes marcados como inativos na carteira.</p></div></CardContent></Card></section>
    </div>}
  </AionDashboardLayout>;
}
