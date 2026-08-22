import AionDashboardLayout from "@/components/AionDashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { CheckCircle2, Clock3, ShieldCheck, UserRoundCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Decision = { requestId: number; decision: "aprovar" | "recusar"; name: string } | null;

const labelByStatus = { pendente: "Em análise", aprovada: "Aprovada", recusada: "Recusada" } as const;

export default function Moderacao() {
  const { user } = useAuth();
  const isConsultor = user?.role === "consultor_aion" || user?.role === "admin";
  const utils = trpc.useUtils();
  const { data: requests = [], isLoading } = trpc.moderation.listRequests.useQuery(undefined, { enabled: isConsultor });
  const [decision, setDecision] = useState<Decision>(null);
  const decideRequest = trpc.moderation.decideRequest.useMutation({
    onSuccess: async (result) => {
      await Promise.all([utils.moderation.listRequests.invalidate(), utils.moderation.pendingCount.invalidate(), utils.clients.list.invalidate()]);
      toast.success(result.state === "aprovada" ? "Conta aprovada e acesso liberado." : "Solicitação recusada.");
      setDecision(null);
    },
    onError: (error) => toast.error(error.message),
  });
  const pending = requests.filter((request) => request.status === "pendente");
  const history = requests.filter((request) => request.status !== "pendente");

  if (!isConsultor) return <AionDashboardLayout><section className="aion-empty"><ShieldCheck className="h-7 w-7" /><h1 className="aion-title">Área restrita</h1><p>A Aion — Moderação é destinada exclusivamente ao Consultor Aion responsável.</p></section></AionDashboardLayout>;

  const renderRequest = (request: (typeof requests)[number]) => <article key={request.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-extrabold tracking-[-.02em]">{request.name}</h2><span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-extrabold ${request.status === "pendente" ? "bg-[#f9e8eb] text-[#8f1727]" : request.status === "aprovada" ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>{labelByStatus[request.status]}</span></div><p className="mt-1 text-sm text-muted-foreground">{request.email}</p><div className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Jornada: </span><strong>{request.businessType === "pessoal" ? "Pessoal / Família" : "MEI / Microempresa"}</strong></p><p><span className="text-muted-foreground">Recebida em: </span><strong>{new Date(request.createdAt).toLocaleDateString("pt-BR")}</strong></p></div></div>{request.status === "pendente" ? <div className="flex shrink-0 gap-2"><Button variant="outline" className="border-[#b21d31]/30 text-[#8f1727] hover:bg-[#f9e8eb]" onClick={() => setDecision({ requestId: request.id, decision: "recusar", name: request.name })}><XCircle className="mr-2 h-4 w-4" />Recusar</Button><Button className="bg-[#b21d31] hover:bg-[#8f1727]" onClick={() => setDecision({ requestId: request.id, decision: "aprovar", name: request.name })}><CheckCircle2 className="mr-2 h-4 w-4" />Aprovar</Button></div> : <p className="text-xs text-muted-foreground">Decisão registrada em {request.decidedAt ? new Date(request.decidedAt).toLocaleDateString("pt-BR") : "—"}</p>}</div></article>;

  return <AionDashboardLayout><section className="aion-page"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="aion-eyebrow">Aion — Moderação</p><h1 className="aion-title mt-2">Solicitações de conta</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Analise somente os pedidos direcionados ao seu atendimento. A aprovação cria o acesso com a senha já protegida e não gera movimentações financeiras.</p></div><div className="aion-metric min-w-40"><Clock3 className="h-5 w-5 text-primary" /><span><strong>{pending.length}</strong><small>pendente(s)</small></span></div></div><div className="mt-7 space-y-3">{isLoading ? <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Carregando solicitações…</p> : pending.length ? pending.map(renderRequest) : <section className="aion-empty"><UserRoundCheck className="h-7 w-7" /><h2 className="text-lg font-extrabold">Nenhuma solicitação pendente</h2><p>Novos pedidos de conta destinados a você aparecerão aqui.</p></section>}</div>{history.length ? <section className="mt-9"><div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-extrabold uppercase tracking-[.12em] text-muted-foreground">Histórico de decisões</h2></div><div className="space-y-3">{history.map(renderRequest)}</div></section> : null}</section><Dialog open={!!decision} onOpenChange={(open) => !open && setDecision(null)}><DialogContent><DialogHeader><DialogTitle>{decision?.decision === "aprovar" ? "Aprovar solicitação" : "Recusar solicitação"}</DialogTitle><DialogDescription>{decision?.decision === "aprovar" ? `Ao aprovar ${decision?.name}, o sistema criará a conta e liberará o login com a senha já enviada.` : `Ao recusar ${decision?.name}, o pedido ficará registrado e o e-mail poderá enviar uma nova solicitação.`}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDecision(null)}>Cancelar</Button><Button className={decision?.decision === "aprovar" ? "bg-[#b21d31] hover:bg-[#8f1727]" : ""} variant={decision?.decision === "recusar" ? "destructive" : "default"} disabled={decideRequest.isPending} onClick={() => decision && decideRequest.mutate({ requestId: decision.requestId, decision: decision.decision })}>{decideRequest.isPending ? "Processando…" : decision?.decision === "aprovar" ? "Confirmar aprovação" : "Confirmar recusa"}</Button></DialogFooter></DialogContent></Dialog></AionDashboardLayout>;
}
