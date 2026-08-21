import { useAuth } from "@/_core/hooks/useAuth";
import AionDashboardLayout from "@/components/AionDashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { CalendarDays, ChevronRight, CircleDollarSign, Landmark, PiggyBank, Plus, Target, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

type Goal = {
  id: number;
  name: string;
  targetAmount: string | number;
  savedAmount: string | number;
  dueDate: Date | string | null;
  color: string;
};

type Contribution = {
  id: number;
  goalId: number;
  goalName: string;
  goalColor: string;
  amount: string | number;
  note: string | null;
  month: string;
  createdAt: Date | string;
};

const money = (value: number | string) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatMonth = (value: string) => new Date(`${value}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const formatDate = (value: Date | string) => new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

function GoalCard({ goal, onContribute }: { goal: Goal; onContribute: (goal: Goal) => void }) {
  const target = Number(goal.targetAmount) || 0;
  const saved = Number(goal.savedAmount) || 0;
  const progress = target ? Math.min((saved / target) * 100, 100) : 0;

  return (
    <Card className="aion-panel overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${goal.color}18`, color: goal.color }}>
            <PiggyBank className="h-5 w-5" />
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-extrabold text-secondary-foreground">{Math.round(progress)}%</span>
        </div>
        <h2 className="mt-5 truncate text-lg font-extrabold tracking-[-0.025em]">{goal.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{money(saved)} guardados de {money(target)}</p>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${progress}%`, backgroundColor: goal.color }} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5 truncate"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{goal.dueDate ? `Prazo: ${formatDate(goal.dueDate)}` : "Sem prazo definido"}</span>
          <Button variant="ghost" size="sm" className="h-auto shrink-0 px-0 font-extrabold text-primary hover:bg-transparent hover:text-primary" onClick={() => onContribute(goal)}>
            Aportar <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Metas() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const utils = trpc.useUtils();
  const isConsultor = user?.role === "consultor_aion" || user?.role === "admin";
  const requestedClientId = useMemo(() => {
    const match = location.match(/^\/clientes\/(\d+)\/metas$/);
    return match ? Number(match[1]) : undefined;
  }, [location]);
  const { data: ownClient, isLoading: ownClientLoading } = trpc.clients.me.useQuery(undefined, { enabled: !!user && !isConsultor });
  const activeClientId = requestedClientId ?? ownClient?.id;
  const queryInput = useMemo(() => ({ clientId: activeClientId ?? 0 }), [activeClientId]);
  const { data: selectedClient } = trpc.clients.get.useQuery(queryInput, { enabled: !!requestedClientId });
  const { data: goals = [], isLoading: goalsLoading } = trpc.financialGoals.list.useQuery(queryInput, { enabled: !!activeClientId });
  const { data: contributions = [], isLoading: contributionsLoading } = trpc.financialGoals.contributions.useQuery(queryInput, { enabled: !!activeClientId });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const refresh = () => Promise.all([
    utils.financialGoals.list.invalidate(queryInput),
    utils.financialGoals.contributions.invalidate(queryInput),
  ]);
  const createGoal = trpc.financialGoals.create.useMutation({
    onSuccess: () => {
      void refresh();
      setCreateOpen(false);
      setName("");
      setTarget("");
      setDueDate("");
    },
  });
  const contribute = trpc.financialGoals.contribute.useMutation({
    onSuccess: () => {
      void refresh();
      setSelectedGoal(null);
      setAmount("");
      setNote("");
    },
  });

  const monthlyContributions = useMemo<[string, Contribution[]][]>(() => {
    const grouped = new Map<string, Contribution[]>();
    (contributions as Contribution[]).forEach((contribution) => {
      grouped.set(contribution.month, [...(grouped.get(contribution.month) ?? []), contribution]);
    });
    return Array.from(grouped.entries()).sort(([left], [right]) => right.localeCompare(left));
  }, [contributions]);
  const totalSaved = (goals as Goal[]).reduce((sum, goal) => sum + (Number(goal.savedAmount) || 0), 0);
  const totalTarget = (goals as Goal[]).reduce((sum, goal) => sum + (Number(goal.targetAmount) || 0), 0);
  const clientName = selectedClient?.businessName || selectedClient?.name || ownClient?.businessName || ownClient?.name;
  const loading = ownClientLoading || (!!activeClientId && (goalsLoading || contributionsLoading));

  return (
    <AionDashboardLayout>
      {loading ? <div className="flex min-h-[52vh] items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div> : !activeClientId ? (
        <div className="aion-page"><section className="aion-empty"><Target className="mx-auto h-8 w-8 text-primary" /><h1 className="mt-4 text-xl font-extrabold">Escolha uma carteira para ver as metas.</h1><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">As caixinhas ficam disponíveis na visão individual de cada cliente.</p><Button className="mt-5" onClick={() => navigate("/clientes")}>Abrir clientes <ChevronRight className="ml-1 h-4 w-4" /></Button></section></div>
      ) : (
        <div className="aion-page">
          <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="aion-eyebrow">Planejamento financeiro</p>
              <h1 className="aion-title">Minhas metas</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">{clientName ? `Acompanhe as reservas de ${clientName} e registre cada aporte com clareza.` : "Organize suas caixinhas e acompanhe cada aporte."}</p>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button className="min-h-11"><Plus className="mr-2 h-4 w-4" />Nova caixinha</Button></DialogTrigger>
              <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Criar uma caixinha</DialogTitle><DialogDescription>Defina o objetivo e o valor que deseja reservar.</DialogDescription></DialogHeader>
                <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); createGoal.mutate({ clientId: activeClientId, name, targetAmount: target, dueDate: dueDate ? new Date(`${dueDate}T12:00:00`) : undefined }); }}>
                  <div className="space-y-2"><Label htmlFor="goal-name">Nome da meta</Label><Input id="goal-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Reserva de emergência" required /></div>
                  <div className="space-y-2"><Label htmlFor="goal-target">Valor a guardar</Label><Input id="goal-target" inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value.replace(",", "."))} placeholder="0,00" required /></div>
                  <div className="space-y-2"><Label htmlFor="goal-date">Prazo desejado</Label><Input id="goal-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={createGoal.isPending}>{createGoal.isPending ? "Criando..." : "Criar caixinha"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <Card className="aion-metric"><CardContent className="p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f9e8eb] text-primary"><PiggyBank className="h-5 w-5" /></span><p className="mt-4 text-sm font-bold text-muted-foreground">Total reservado</p><p className="mt-1 text-2xl font-extrabold tracking-[-0.045em]">{money(totalSaved)}</p></CardContent></Card>
            <Card className="aion-metric"><CardContent className="p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"><Target className="h-5 w-5" /></span><p className="mt-4 text-sm font-bold text-muted-foreground">Objetivos cadastrados</p><p className="mt-1 text-2xl font-extrabold tracking-[-0.045em]">{goals.length}</p></CardContent></Card>
            <Card className="aion-metric"><CardContent className="p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0e7e3] text-[#2d2d2d]"><CircleDollarSign className="h-5 w-5" /></span><p className="mt-4 text-sm font-bold text-muted-foreground">Valor planejado</p><p className="mt-1 text-2xl font-extrabold tracking-[-0.045em]">{money(totalTarget)}</p></CardContent></Card>
          </section>

          <section><div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="text-xl font-extrabold tracking-[-0.03em]">Suas caixinhas</h2><p className="mt-1 text-sm text-muted-foreground">Reserve recursos para as prioridades que importam agora.</p></div></div>
            {goals.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(goals as Goal[]).map((goal) => <GoalCard key={goal.id} goal={goal} onContribute={setSelectedGoal} />)}</div> : <div className="aion-empty"><WalletCards className="mx-auto h-8 w-8 text-primary" /><h2 className="mt-4 text-lg font-extrabold">Sua primeira caixinha começa aqui.</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Crie uma meta para transformar uma intenção em uma reserva acompanhada.</p><Button className="mt-5" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Criar primeira meta</Button></div>}
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <Card className="aion-panel"><CardContent className="p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f9e8eb] text-primary"><Landmark className="h-5 w-5" /></span><div><h2 className="font-extrabold">Histórico de aportes</h2><p className="mt-1 text-sm text-muted-foreground">Cada valor registrado aparece organizado pelo mês em que foi realizado.</p></div></div>
              <div className="mt-5 space-y-6">{monthlyContributions.length ? monthlyContributions.map(([month, items]) => <div key={month}><div className="flex items-center justify-between gap-3"><p className="capitalize text-sm font-extrabold">{formatMonth(month)}</p><span className="text-sm font-extrabold text-primary">{money(items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0))}</span></div><div className="mt-3 space-y-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl bg-secondary/70 px-4 py-3"><span className="min-w-0"><span className="flex items-center gap-2 truncate text-sm font-bold"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.goalColor }} />{item.goalName}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.note || `Registrado em ${formatDate(item.createdAt)}`}</span></span><span className="shrink-0 text-sm font-extrabold">{money(item.amount)}</span></div>)}</div></div>) : <p className="rounded-xl bg-secondary/60 px-4 py-5 text-sm text-muted-foreground">Os aportes aparecerão aqui depois do primeiro registro.</p>}</div>
            </CardContent></Card>
            <Card className="aion-panel"><CardContent className="p-5 sm:p-6"><p className="aion-eyebrow">Leitura rápida</p><h2 className="mt-3 text-xl font-extrabold tracking-[-0.03em]">Acompanhe o ritmo das reservas.</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">As caixinhas tornam objetivos visíveis. Registre cada aporte para acompanhar a evolução por meta e por mês.</p><div className="mt-6 rounded-2xl bg-[#f9e8eb] p-5"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#a8192c]">Próximo passo</p><p className="mt-2 font-extrabold">Defina uma prioridade e programe o próximo aporte.</p></div></CardContent></Card>
          </section>

          <Dialog open={!!selectedGoal} onOpenChange={(open) => !open && setSelectedGoal(null)}>
            <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Adicionar à caixinha</DialogTitle><DialogDescription>{selectedGoal?.name}</DialogDescription></DialogHeader>
              <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (selectedGoal) contribute.mutate({ goalId: selectedGoal.id, amount, note: note.trim() || undefined }); }}>
                <div className="space-y-2"><Label htmlFor="contribution-value">Valor do aporte</Label><Input id="contribution-value" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(",", "."))} placeholder="0,00" required /></div>
                <div className="space-y-2"><Label htmlFor="contribution-note">Observação <span className="text-muted-foreground">(opcional)</span></Label><Input id="contribution-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex.: Aporte do mês" maxLength={280} /></div>
                <Button type="submit" className="w-full" disabled={contribute.isPending}>{contribute.isPending ? "Registrando..." : "Confirmar aporte"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </AionDashboardLayout>
  );
}
