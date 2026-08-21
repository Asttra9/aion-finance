import { useAuth } from "@/_core/hooks/useAuth";
import AionDashboardLayout from "@/components/AionDashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import {
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  ChartNoAxesCombined,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  Landmark,
  ReceiptText,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocation } from "wouter";

const COLORS = ["#b21d31", "#363636", "#d77984", "#aa9b90", "#6f6965"];

type TransactionLike = { date: Date | string; amount: string | number; type: "receita" | "despesa"; categoryId: number | null; financeType: "pessoal" | "empresarial"; };
type AccountLike = { id: number; description: string; amount: string | number; dueDate: Date | string; status: "pendente" | "pago" | "vencido" | "cancelado"; category?: string | null; };

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const amountOf = (value: string | number) => Number(value) || 0;
const dateLabel = (value: Date | string) => new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

function Metric({ label, value, note, tone = "default", icon: Icon }: { label: string; value: string; note: string; tone?: "default" | "positive" | "negative"; icon: typeof WalletCards }) {
  const colors = tone === "positive" ? "text-emerald-700 bg-emerald-50" : tone === "negative" ? "text-primary bg-accent" : "text-foreground bg-secondary";
  return <Card className="aion-metric">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-extrabold tracking-[-0.045em]">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors}`}><Icon className="h-5 w-5" /></span></div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{note}</p>
    </CardContent>
  </Card>;
}

function ChartPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card className="aion-panel"><CardContent className="p-5 sm:p-6"><div className="mb-5"><h3 className="text-lg font-extrabold tracking-[-0.03em]">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{children}</CardContent></Card>;
}

function EmptyState({ text, action, onAction }: { text: string; action: string; onAction: () => void }) {
  return <div className="aion-empty"><p className="font-bold">{text}</p><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">O painel passa a gerar leituras assim que os lançamentos e compromissos forem registrados.</p><Button onClick={onAction} className="mt-5 min-h-11">{action}<ChevronRight className="ml-1 h-4 w-4" /></Button></div>;
}

function PersonalDashboard({ transactions, accounts, categories, navigate }: { transactions: TransactionLike[]; accounts: AccountLike[]; categories: Array<{ id: number; name: string }> ; navigate: (path: string) => void }) {
  const finance = useMemo(() => buildFinance(transactions, categories, "pessoal"), [transactions, categories]);
  const overdue = accounts.filter((item) => item.status === "vencido");
  const due = accounts.filter((item) => item.status === "pendente");
  const paid = accounts.filter((item) => item.status === "pago");
  const hasData = transactions.length > 0 || accounts.length > 0;

  return <div className="aion-page">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="aion-eyebrow">Finanças pessoais</p><h2 className="aion-title">Seu mês, em ordem.</h2><p className="mt-2 max-w-2xl text-muted-foreground">Acompanhe entradas, gastos e compromissos sem transformar sua vida financeira em uma planilha.</p></div><Button variant="outline" className="min-h-11 border-primary/30 text-primary hover:bg-accent" onClick={() => navigate("/transacoes")}>Ver todos os lançamentos <ArrowUpRight className="ml-2 h-4 w-4" /></Button></section>
    {!hasData ? <EmptyState text="Ainda não há movimentações neste perfil." action="Registrar movimentação" onAction={() => navigate("/transacoes")} /> : <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Entradas no período" value={money(finance.income)} note="Salário e demais recebimentos" tone="positive" icon={ArrowUpRight} />
        <Metric label="Gastos no período" value={money(finance.expense)} note="Despesas categorizadas" tone="negative" icon={ArrowDownRight} />
        <Metric label="Contas a pagar" value={money(sumAccounts(due))} note={`${due.length} compromisso(s) em aberto`} icon={ReceiptText} />
        <Metric label="Inadimplência" value={money(sumAccounts(overdue))} note={`${overdue.length} conta(s) vencida(s)`} tone={overdue.length ? "negative" : "positive"} icon={CircleAlert} />
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]"><ChartPanel title="Evolução do saldo" description="Entradas e gastos acumulados nos últimos 7 dias"><ResponsiveContainer width="100%" height={290}><AreaChart data={finance.weekly}><defs><linearGradient id="aionPersonalIncome" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#b21d31" stopOpacity={0.32}/><stop offset="100%" stopColor="#b21d31" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5dfda"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#716a67", fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} tick={{ fill: "#716a67", fontSize: 12 }}/><Tooltip formatter={(value: number) => money(value)} contentStyle={{ borderRadius: 14, border: "1px solid #e5dfda" }}/><Area type="monotone" dataKey="saldo" name="Saldo do dia" stroke="#b21d31" strokeWidth={3} fill="url(#aionPersonalIncome)"/></AreaChart></ResponsiveContainer></ChartPanel><ChartPanel title="Para onde foi seu dinheiro" description="Gastos por categoria no período"><ResponsiveContainer width="100%" height={290}><PieChart><Pie data={finance.categories} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={3}>{finance.categories.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value: number) => money(value)} contentStyle={{ borderRadius: 14, border: "1px solid #e5dfda" }}/><Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }}/></PieChart></ResponsiveContainer></ChartPanel></section>
      <section className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]"><ChartPanel title="Próximas contas" description="Compromissos que exigem atenção"><div className="space-y-3">{[...overdue, ...due].sort((a,b) => +new Date(a.dueDate) - +new Date(b.dueDate)).slice(0,5).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl bg-secondary/70 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{item.description}</p><p className={`mt-0.5 text-xs font-bold ${item.status === "vencido" ? "text-primary" : "text-muted-foreground"}`}>{item.status === "vencido" ? "Em atraso" : `Vence em ${dateLabel(item.dueDate)}`}</p></div><span className="shrink-0 font-extrabold">{money(amountOf(item.amount))}</span></div>)}{!due.length && !overdue.length && <p className="py-4 text-sm text-muted-foreground">Nenhuma conta pendente ou em atraso.</p>}</div><Button variant="ghost" className="mt-4 min-h-11 px-0 text-primary hover:bg-transparent hover:text-primary" onClick={() => navigate("/contas-pagar")}>Gerenciar contas <ChevronRight className="ml-1 h-4 w-4" /></Button></ChartPanel><ChartPanel title="Resumo de compromissos" description="O que já foi resolvido neste mês"><div className="space-y-4"><SummaryLine icon={CircleCheck} label="Contas pagas" value={`${paid.length} registro(s)`} /><SummaryLine icon={CalendarClock} label="A vencer" value={`${due.length} registro(s)`} /><SummaryLine icon={CircleAlert} label="Em atraso" value={`${overdue.length} registro(s)`} /></div></ChartPanel></section>
    </>}
  </div>;
}

function BusinessDashboard({ transactions, accountsPayable, accountsReceivable, categories, navigate, label }: { transactions: TransactionLike[]; accountsPayable: AccountLike[]; accountsReceivable: AccountLike[]; categories: Array<{ id: number; name: string }>; navigate: (path: string) => void; label: string }) {
  const finance = useMemo(() => buildFinance(transactions, categories, "empresarial"), [transactions, categories]);
  const due = accountsPayable.filter((item) => item.status === "pendente" || item.status === "vencido");
  const receivable = accountsReceivable.filter((item) => item.status === "pendente" || item.status === "vencido");
  const hasData = transactions.length > 0 || accountsPayable.length > 0 || accountsReceivable.length > 0;
  const operationalBalance = finance.income - finance.expense;

  return <div className="aion-page">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="aion-eyebrow">Gestão do negócio</p><h2 className="aion-title">O negócio de {label}, com clareza.</h2><p className="mt-2 max-w-2xl text-muted-foreground">Priorize caixa, obrigações e recebimentos com uma leitura financeira direta.</p></div><Button variant="outline" className="min-h-11 border-primary/30 text-primary hover:bg-accent" onClick={() => navigate("/transacoes")}>Abrir fluxo de caixa <ArrowUpRight className="ml-2 h-4 w-4" /></Button></section>
    {!hasData ? <EmptyState text="Este negócio ainda não possui lançamentos." action="Registrar primeira movimentação" onAction={() => navigate("/transacoes")} /> : <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Saldo operacional" value={money(operationalBalance)} note={operationalBalance >= 0 ? "Entradas cobrem as saídas" : "Saídas acima das entradas"} tone={operationalBalance >= 0 ? "positive" : "negative"} icon={Landmark}/><Metric label="Entradas" value={money(finance.income)} note="Receitas do período" tone="positive" icon={ArrowUpRight}/><Metric label="Saídas" value={money(finance.expense)} note="Despesas do período" tone="negative" icon={ArrowDownRight}/><Metric label="Obrigações próximas" value={money(sumAccounts(due))} note={`${due.length} conta(s) pendente(s) ou vencida(s)`} tone={due.some((item) => item.status === "vencido") ? "negative" : "default"} icon={CalendarClock}/></section>
      <section className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]"><ChartPanel title="Fluxo de caixa semanal" description="Entradas e saídas registradas nos últimos 7 dias"><ResponsiveContainer width="100%" height={290}><AreaChart data={finance.weekly}><defs><linearGradient id="aionIncome" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#b21d31" stopOpacity={0.28}/><stop offset="100%" stopColor="#b21d31" stopOpacity={0}/></linearGradient><linearGradient id="aionExpense" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#363636" stopOpacity={0.18}/><stop offset="100%" stopColor="#363636" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5dfda"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#716a67", fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} tick={{ fill: "#716a67", fontSize: 12 }}/><Tooltip formatter={(value: number) => money(value)} contentStyle={{ borderRadius: 14, border: "1px solid #e5dfda" }}/><Legend iconType="circle"/><Area type="monotone" dataKey="receita" name="Entradas" stroke="#b21d31" strokeWidth={3} fill="url(#aionIncome)"/><Area type="monotone" dataKey="despesa" name="Saídas" stroke="#363636" strokeWidth={2} fill="url(#aionExpense)"/></AreaChart></ResponsiveContainer></ChartPanel><ChartPanel title="Saídas por categoria" description="Onde o caixa foi comprometido"><ResponsiveContainer width="100%" height={290}><BarChart data={finance.categories} layout="vertical" margin={{ left: 12 }}><CartesianGrid horizontal={false} stroke="#e5dfda"/><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={90} axisLine={false} tickLine={false} tick={{ fill: "#716a67", fontSize: 12 }}/><Tooltip formatter={(value: number) => money(value)} contentStyle={{ borderRadius: 14, border: "1px solid #e5dfda" }}/><Bar dataKey="value" name="Saídas" fill="#b21d31" radius={[0,8,8,0]} /></BarChart></ResponsiveContainer></ChartPanel></section>
      <section className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]"><ChartPanel title="Agenda financeira" description="Obrigações e recebimentos que merecem acompanhamento"><div className="space-y-3">{[...due, ...receivable].sort((a,b) => +new Date(a.dueDate) - +new Date(b.dueDate)).slice(0,6).map((item) => { const das = /\bdas\b/i.test(`${item.description} ${item.category ?? ""}`); const overdue = item.status === "vencido"; return <div key={`${item.id}-${item.description}`} className="flex items-center justify-between gap-4 rounded-xl bg-secondary/70 px-4 py-3"><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-extrabold">{item.description}</p>{das && <span className="rounded-md bg-accent px-1.5 py-0.5 text-[0.63rem] font-extrabold uppercase tracking-wider text-primary">DAS</span>}</div><p className={`mt-0.5 text-xs font-bold ${overdue ? "text-primary" : "text-muted-foreground"}`}>{overdue ? "Em atraso" : `Vencimento ${dateLabel(item.dueDate)}`}</p></div><span className="shrink-0 font-extrabold">{money(amountOf(item.amount))}</span></div>; })}{!due.length && !receivable.length && <p className="py-4 text-sm text-muted-foreground">Sem compromissos ou recebimentos pendentes.</p>}</div></ChartPanel><ChartPanel title="Leitura Aion" description="Sinais para sua próxima decisão"><div className="space-y-4"><Insight icon={operationalBalance >= 0 ? CircleCheck : CircleAlert} title={operationalBalance >= 0 ? "Operação positiva" : "Atenção ao caixa"} text={operationalBalance >= 0 ? "As entradas registradas superam as saídas no período." : "As saídas registradas superam as entradas no período."}/><Insight icon={CalendarClock} title="Próximos vencimentos" text={due.length ? `${due.length} compromisso(s) exigem acompanhamento.` : "Não há obrigações pendentes registradas."}/><Insight icon={CircleDollarSign} title="Valores a receber" text={receivable.length ? `${money(sumAccounts(receivable))} ainda está previsto para recebimento.` : "Não há valores em aberto registrados."}/></div></ChartPanel></section>
    </>}
  </div>;
}

function ConsultantDashboard({ clients, navigate }: { clients: Array<{ id: number; name: string; businessType: string; status: string }>; navigate: (path: string) => void }) {
  const byType = useMemo(() => ["pessoal", "mei", "profissional_liberal", "pj"].map((type) => ({ name: type === "pessoal" ? "Pessoal" : type === "mei" ? "MEI" : type === "pj" ? "PJ" : "Prof. liberal", value: clients.filter((item) => item.businessType === type).length })).filter((item) => item.value > 0), [clients]);
  const active = clients.filter((item) => item.status === "ativo").length;
  const onboarding = clients.filter((item) => item.status === "em_onboarding").length;
  return <div className="aion-page"><section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="aion-eyebrow">Consultor Aion</p><h2 className="aion-title">Sua carteira, com direção.</h2><p className="mt-2 max-w-2xl text-muted-foreground">Abra a visão de cada cliente para atuar no que é mais urgente, sem misturar jornadas pessoais e empresariais.</p></div><Button className="min-h-11" onClick={() => navigate("/clientes")}>Gerenciar clientes <ChevronRight className="ml-1 h-4 w-4" /></Button></section><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Clientes na carteira" value={String(clients.length)} note="Perfis acompanhados pela Aion" icon={UsersRound}/><Metric label="Clientes ativos" value={String(active)} note="Relacionamentos em acompanhamento" tone="positive" icon={CircleCheck}/><Metric label="Em onboarding" value={String(onboarding)} note="Demandam próximos passos" tone={onboarding ? "default" : "positive"} icon={CalendarClock}/><Metric label="Clientes MEI" value={String(clients.filter((item) => item.businessType === "mei").length)} note="Possíveis jornadas de abertura/regularização" icon={BriefcaseBusiness}/></section><section className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]"><ChartPanel title="Composição da carteira" description="Distribuição por jornada financeira">{byType.length ? <ResponsiveContainer width="100%" height={290}><PieChart><Pie data={byType} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={3}>{byType.map((item,index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]}/>)}</Pie><Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e5dfda" }}/><Legend verticalAlign="bottom" iconType="circle"/></PieChart></ResponsiveContainer> : <EmptyState text="Sua carteira ainda está vazia." action="Cadastrar cliente" onAction={() => navigate("/clientes")}/>}</ChartPanel><ChartPanel title="Ações prioritárias" description="Comece por uma visão individual para orientar a próxima conversa"><div className="space-y-3">{clients.slice(0,5).map((client) => <button key={client.id} onClick={() => navigate(`/clientes/${client.id}/dashboard`)} className="flex min-h-16 w-full items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 text-left transition hover:border-primary/45 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-primary"><span className="min-w-0"><span className="block truncate font-extrabold">{client.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{client.businessType === "pessoal" ? "Finanças pessoais" : client.businessType === "mei" ? "Microempreendedor individual" : "Gestão empresarial"}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-primary"/></button>)}{!clients.length && <p className="py-4 text-sm text-muted-foreground">Cadastre o primeiro cliente para iniciar o acompanhamento.</p>}</div></ChartPanel></section></div>;
}

function SummaryLine({ icon: Icon, label, value }: { icon: typeof CircleCheck; label: string; value: string }) { return <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground"><Icon className="h-5 w-5"/></span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{label}</p><p className="text-xs text-muted-foreground">{value}</p></div></div>; }
function Insight({ icon: Icon, title, text }: { icon: typeof CircleCheck; title: string; text: string }) { return <div className="flex gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"><Icon className="h-4 w-4"/></span><div><p className="text-sm font-extrabold">{title}</p><p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{text}</p></div></div>; }
function sumAccounts(items: AccountLike[]) { return items.reduce((sum, item) => sum + amountOf(item.amount), 0); }

function buildFinance(transactions: TransactionLike[], categories: Array<{ id: number; name: string }>, financeType: "pessoal" | "empresarial") {
  const source = transactions.filter((item) => item.financeType === financeType);
  const income = source.filter((item) => item.type === "receita").reduce((sum, item) => sum + amountOf(item.amount), 0);
  const expense = source.filter((item) => item.type === "despesa").reduce((sum, item) => sum + amountOf(item.amount), 0);
  const categoryName = new Map(categories.map((item) => [item.id, item.name]));
  const categoryMap = new Map<string, number>();
  source.filter((item) => item.type === "despesa").forEach((item) => { const name = item.categoryId ? categoryName.get(item.categoryId) ?? "Sem categoria" : "Sem categoria"; categoryMap.set(name, (categoryMap.get(name) ?? 0) + amountOf(item.amount)); });
  const week = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); const matching = source.filter((item) => { const entry = new Date(item.date); return entry.getFullYear() === date.getFullYear() && entry.getMonth() === date.getMonth() && entry.getDate() === date.getDate(); }); const receita = matching.filter((item) => item.type === "receita").reduce((sum, item) => sum + amountOf(item.amount), 0); const despesa = matching.filter((item) => item.type === "despesa").reduce((sum, item) => sum + amountOf(item.amount), 0); return { label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""), receita, despesa, saldo: receita - despesa }; });
  return { income, expense, categories: Array.from(categoryMap, ([name, value]) => ({ name, value })).sort((a,b) => b.value-a.value).slice(0,5), weekly: week };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const isConsultor = user?.role === "consultor_aion" || user?.role === "admin";
  const match = location.match(/^\/clientes\/(\d+)\/dashboard$/);
  const requestedClientId = match ? Number(match[1]) : undefined;
  const navigateWithinContext = (path: string) => requestedClientId ? (path === "/dashboard" ? `/clientes/${requestedClientId}/dashboard` : `/clientes/${requestedClientId}${path}`) : path;
  const { data: ownClient, isLoading: ownClientLoading } = trpc.clients.me.useQuery(undefined, { enabled: !!user && !isConsultor });
  const activeClientId = requestedClientId ?? ownClient?.id;
  const { data: selectedClient } = trpc.clients.get.useQuery({ clientId: activeClientId ?? 0 }, { enabled: !!activeClientId });
  const { data: clients = [], isLoading: clientListLoading } = trpc.clients.list.useQuery(undefined, { enabled: isConsultor && !requestedClientId });
  const { data: transactions = [], isLoading: transactionsLoading } = trpc.transactions.list.useQuery({ clientId: activeClientId ?? 0 }, { enabled: !!activeClientId });
  const { data: categories = [] } = trpc.transactions.categoriesForClient.useQuery({ clientId: activeClientId ?? 0 }, { enabled: !!activeClientId });
  const { data: accountsPayable = [] } = trpc.accountsPayable.list.useQuery({ clientId: activeClientId ?? 0 }, { enabled: !!activeClientId });
  const { data: accountsReceivable = [] } = trpc.accountsReceivable.list.useQuery({ clientId: activeClientId ?? 0 }, { enabled: !!activeClientId });

  const loading = !isConsultor ? ownClientLoading || (!!activeClientId && transactionsLoading) : (!!requestedClientId && transactionsLoading) || (!requestedClientId && clientListLoading);
  const client = selectedClient ?? ownClient;
  const businessType = client?.businessType;

  return <AionDashboardLayout>{loading ? <div className="flex min-h-[52vh] items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div> : !isConsultor && !client ? <div className="aion-page"><EmptyState text="Seu acesso ainda não está vinculado a um perfil financeiro." action="Voltar ao início" onAction={() => navigate("/")} /></div> : isConsultor && !requestedClientId ? <ConsultantDashboard clients={clients} navigate={navigate} /> : businessType === "pessoal" ? <PersonalDashboard transactions={transactions} accounts={accountsPayable} categories={categories} navigate={(path) => navigate(navigateWithinContext(path))} /> : <BusinessDashboard transactions={transactions} accountsPayable={accountsPayable} accountsReceivable={accountsReceivable} categories={categories} navigate={(path) => navigate(navigateWithinContext(path))} label={client?.businessName || client?.name || "sua empresa"} />}</AionDashboardLayout>;
}
