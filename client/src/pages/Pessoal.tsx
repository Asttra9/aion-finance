import AionDashboardLayout from "@/components/AionDashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MonthlyFinancialOverview from "@/components/MonthlyFinancialOverview";
import FinancialPdfButton from "@/components/FinancialPdfButton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { CalendarDays, CreditCard, Plus, ReceiptText, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const value = (amount: string | number) => Number(amount) || 0;

function Metric({ label, amount, note, icon: Icon }: { label: string; amount: string; note: string; icon: typeof WalletCards }) {
  return <Card className="aion-metric"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-extrabold tracking-[-.045em]">{amount}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0e7e3] text-primary"><Icon className="h-5 w-5" /></span></div><p className="mt-3 text-xs font-medium text-muted-foreground">{note}</p></CardContent></Card>;
}

export default function Pessoal() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: client, isLoading: clientLoading } = trpc.clients.me.useQuery();
  const clientId = client?.id ?? 0;
  const { data: transactions = [], isLoading: transactionsLoading } = trpc.transactions.list.useQuery({ clientId, limit: 100 }, { enabled: !!clientId });
  const { data: accounts = [] } = trpc.accountsPayable.list.useQuery({ clientId }, { enabled: !!clientId });
  const { data: subscriptions = [] } = trpc.subscriptions.list.useQuery({ clientId }, { enabled: !!clientId });
  const { data: recurringOccurrences = [] } = trpc.recurringTransactions.occurrences.useQuery({ clientId }, { enabled: !!clientId });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState("");
  const addSubscription = trpc.subscriptions.create.useMutation({ onSuccess: () => { void utils.subscriptions.list.invalidate({ clientId }); void utils.recurringTransactions.list.invalidate({ clientId }); void utils.recurringTransactions.occurrences.invalidate({ clientId }); setDialogOpen(false); setName(""); setAmount(""); setBillingDay(""); } });

  const summary = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now); startOfWeek.setHours(0, 0, 0, 0); startOfWeek.setDate(now.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const personalExpenses = transactions.filter((transaction) => transaction.financeType === "pessoal" && transaction.type === "despesa");
    const weekly = personalExpenses.filter((transaction) => new Date(transaction.date) >= startOfWeek).reduce((total, transaction) => total + value(transaction.amount), 0);
    const monthly = personalExpenses.filter((transaction) => new Date(transaction.date) >= startOfMonth).reduce((total, transaction) => total + value(transaction.amount), 0);
    const openAccounts = accounts.filter((account) => account.status === "pendente" || account.status === "vencido").reduce((total, account) => total + value(account.amount), 0);
    return { weekly, monthly, openAccounts };
  }, [accounts, transactions]);
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "ativa");
  const subscriptionTotal = activeSubscriptions.reduce((total, subscription) => total + value(subscription.amount), 0);
  const upcomingRecurring = recurringOccurrences.filter((item) => item.occurrence.status === "previsto" && item.rule.financeType === "pessoal").slice(0, 3);

  if (clientLoading || (clientId && transactionsLoading)) return <AionDashboardLayout><div className="flex min-h-[52vh] items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div></AionDashboardLayout>;
  if (!client) return <AionDashboardLayout><div className="aion-page"><p className="text-muted-foreground">Seu acesso ainda não está vinculado a uma jornada financeira.</p></div></AionDashboardLayout>;

  return <AionDashboardLayout>
    <div className="aion-page">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="aion-eyebrow">Finanças pessoais</p><h2 className="aion-title">Seu cotidiano, com mais clareza.</h2><p className="mt-2 max-w-2xl text-muted-foreground">Acompanhe seus gastos recentes, compromissos e assinaturas cadastradas sem depender de estimativas automáticas.</p></div><div className="flex flex-wrap gap-2"><FinancialPdfButton clientId={clientId} reportType="resumo_pessoal" label="Baixar resumo PDF"/><Button variant="outline" className="min-h-11 border-primary/30 text-primary hover:bg-accent" onClick={() => navigate("/transacoes")}>Ver lançamentos</Button></div></section>
      <MonthlyFinancialOverview transactions={transactions} financeType="pessoal" />
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Gastos da semana" amount={money(summary.weekly)} note="Despesas pessoais nos últimos 7 dias" icon={ReceiptText}/><Metric label="Gastos do mês" amount={money(summary.monthly)} note="Despesas pessoais desde o início do mês" icon={WalletCards}/><Metric label="Assinaturas ativas" amount={money(subscriptionTotal)} note={`${activeSubscriptions.length} serviço(s) cadastrado(s)`} icon={CreditCard}/><Metric label="Contas em aberto" amount={money(summary.openAccounts)} note="Compromissos pendentes ou vencidos" icon={CalendarDays}/></section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><Card className="aion-panel"><CardContent className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-extrabold tracking-[-.03em]">Assinaturas de serviços</h3><p className="mt-1 text-sm text-muted-foreground">Cadastre apenas serviços que você reconhece como recorrentes.</p></div><Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger asChild><Button size="sm" className="min-h-9"><Plus className="mr-1 h-4 w-4"/>Adicionar</Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Adicionar assinatura</DialogTitle><DialogDescription>Registre um serviço recorrente para acompanhá-lo no seu orçamento.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); addSubscription.mutate({ clientId, name, amount: amount.replace(",", "."), billingDay: Number(billingDay) }); }}><div className="space-y-2"><Label htmlFor="subscription-name">Serviço</Label><Input id="subscription-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Streaming" required/></div><div className="space-y-2"><Label htmlFor="subscription-amount">Valor mensal</Label><Input id="subscription-amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0,00" required/></div><div className="space-y-2"><Label htmlFor="subscription-day">Dia de cobrança</Label><Input id="subscription-day" value={billingDay} onChange={(event) => setBillingDay(event.target.value)} type="number" min="1" max="31" required/></div><Button className="w-full" type="submit" disabled={addSubscription.isPending}>{addSubscription.isPending ? "Salvando..." : "Salvar assinatura"}</Button></form></DialogContent></Dialog></div><div className="mt-5 space-y-3">{activeSubscriptions.map((subscription) => <div key={subscription.id} className="flex min-h-15 items-center justify-between rounded-xl bg-secondary/65 px-4"><div><p className="font-extrabold">{subscription.name}</p><p className="mt-0.5 text-xs text-muted-foreground">Cobrança todo dia {subscription.billingDay}</p></div><p className="font-extrabold">{money(value(subscription.amount))}</p></div>)}{!activeSubscriptions.length && <p className="rounded-xl bg-secondary/55 px-4 py-5 text-sm text-muted-foreground">Nenhuma assinatura foi cadastrada ainda.</p>}</div></CardContent></Card><Card className="aion-panel"><CardContent className="p-5 sm:p-6"><h3 className="text-lg font-extrabold tracking-[-.03em]">Próximos compromissos</h3><p className="mt-1 text-sm text-muted-foreground">Previsões são lembretes: um gasto só entra no saldo depois de confirmado.</p><div className="mt-5 space-y-3">{upcomingRecurring.map(({ occurrence, rule }) => <div key={occurrence.id} className="rounded-xl bg-secondary/60 px-4 py-3"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-extrabold">{rule.description}</p><p className="shrink-0 text-sm font-extrabold">{money(value(rule.amount))}</p></div><p className="mt-1 text-xs text-muted-foreground">Previsto para {new Date(occurrence.scheduledDate).toLocaleDateString("pt-BR")}</p></div>)}{!upcomingRecurring.length && <p className="rounded-xl bg-secondary/55 px-4 py-5 text-sm text-muted-foreground">Seus próximos compromissos aparecerão aqui.</p>}<div className="rounded-xl border border-border bg-card p-4"><p className="text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">Comprometimento mensal conhecido</p><p className="mt-2 text-2xl font-extrabold">{money(subscriptionTotal + summary.openAccounts)}</p><p className="mt-1 text-xs text-muted-foreground">Assinaturas ativas + contas abertas.</p></div><Button variant="outline" className="w-full" onClick={() => navigate("/contas-pagar")}>Organizar contas</Button></div></CardContent></Card></section>
    </div>
  </AionDashboardLayout>;
}
