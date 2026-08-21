import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { trpc } from "@/lib/trpc";
import {
  ArrowRightLeft,
  BellRing,
  BriefcaseBusiness,
  CalendarClock,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileBarChart2,
  Landmark,
  LogOut,
  ReceiptText,
  Target,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

interface AionDashboardLayoutProps { children: ReactNode; }

const AION_MARK_URL = "/manus-storage/aion-logo-dark_9a4b34db.png";

type Item = { label: string; href: string; icon: typeof ChartNoAxesCombined; };

const money = (value: number | string) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const contributionDate = (value: Date | string) => new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export default function AionDashboardLayout({ children }: AionDashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const isConsultor = user?.role === "consultor_aion" || user?.role === "admin";
  const { data: linkedClient } = trpc.clients.me.useQuery(undefined, { enabled: !!user && !isConsultor });
  const isPersonal = linkedClient?.businessType === "pessoal";
  const isMei = linkedClient?.businessType === "mei";
  const contextClientId = location.match(/^\/clientes\/(\d+)/)?.[1];
  const activeClientId = contextClientId ? Number(contextClientId) : linkedClient?.id;
  const alertsQueryInput = useMemo(() => ({ clientId: activeClientId ?? 0 }), [activeClientId]);
  const { data: alerts = [] } = trpc.notifications.list.useQuery(alertsQueryInput, { enabled: !!activeClientId });
  const { data: contributions = [] } = trpc.financialGoals.contributions.useQuery(alertsQueryInput, { enabled: !!activeClientId });
  const unreadAlerts = alerts.filter((alert) => !alert.read);
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthlyContributions = contributions.filter((contribution) => contribution.month === monthKey).slice(0, 4);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeWhenClickingOutside = (event: MouseEvent) => {
      if (alertsMenuRef.current && !alertsMenuRef.current.contains(event.target as Node)) setAlertsOpen(false);
    };
    document.addEventListener("mousedown", closeWhenClickingOutside);
    return () => document.removeEventListener("mousedown", closeWhenClickingOutside);
  }, []);

  const consultantItems: Item[] = [
    { label: "Visão Aion", href: "/dashboard", icon: ChartNoAxesCombined },
    { label: "Clientes", href: "/clientes", icon: UsersRound },
    { label: "Conciliação", href: "/conciliacao", icon: ArrowRightLeft },
    { label: "Relatórios", href: "/relatorios", icon: FileBarChart2 },
  ];

  const personalItems: Item[] = [
    { label: "Visão geral", href: "/dashboard", icon: ChartNoAxesCombined },
    { label: "Minhas contas", href: "/contas-pagar", icon: ReceiptText },
    { label: "Gastos e entradas", href: "/transacoes", icon: WalletCards },
    { label: "Minhas metas", href: "/metas", icon: Target },
    { label: "Relatórios", href: "/relatorios", icon: FileBarChart2 },
  ];

  const businessItems: Item[] = [
    { label: "Visão do negócio", href: "/dashboard", icon: ChartNoAxesCombined },
    { label: "Fluxo de caixa", href: "/transacoes", icon: Landmark },
    { label: "Contas e obrigações", href: "/contas-pagar", icon: CalendarClock },
    { label: "Entradas", href: "/contas-receber", icon: CircleDollarSign },
    { label: "Metas do negócio", href: "/metas", icon: Target },
    { label: "Relatórios", href: "/relatorios", icon: FileBarChart2 },
    ...(isMei ? [{ label: "Jornada MEI", href: "/mei-workflow", icon: BriefcaseBusiness }] : []),
  ];

  const menuItems = isConsultor ? consultantItems : isPersonal ? personalItems : businessItems;
  const workspaceName = isConsultor ? "Consultor Aion" : isPersonal ? "Finanças pessoais" : "Gestão do negócio";
  const contextualHref = (href: string) => {
    if (!contextClientId) return href;
    return href === "/dashboard" ? `/clientes/${contextClientId}/dashboard` : `/clientes/${contextClientId}${href}`;
  };
  const activeLabel = menuItems.find((item) => location === contextualHref(item.href))?.label ?? workspaceName;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
            <button onClick={() => navigate(isConsultor ? "/clientes" : "/dashboard")} className="flex min-h-11 w-full items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <img src={AION_MARK_URL} alt="Símbolo da Aion" className="h-10 w-10 rounded-xl object-cover" />
              <span className="min-w-0">
                <span className="block text-base font-extrabold tracking-[-0.03em]">Aion</span>
                <span className="block truncate text-xs text-[#c5bdb8]">{workspaceName}</span>
              </span>
            </button>
          </SidebarHeader>

          <SidebarContent className="px-2 py-2">
            <p className="aion-nav-label">Seu espaço</p>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const href = contextualHref(item.href);
                const active = location === href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      onClick={() => navigate(href)}
                      isActive={active}
                      className="min-h-11 rounded-xl px-3 text-[0.88rem] font-semibold text-[#ded7d2] hover:bg-[#3a3838] hover:text-white data-[active=true]:bg-primary data-[active=true]:text-white"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <div className="mt-auto border-t border-sidebar-border p-4">
            <div className="mb-4 rounded-xl bg-[#3a3838] p-3">
              <p className="truncate text-sm font-bold text-white">{user?.name ?? "Conta Aion"}</p>
              <p className="mt-0.5 truncate text-xs text-[#c5bdb8]">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" className="min-h-11 w-full border-[#575252] bg-transparent text-[#f8f6f3] hover:bg-[#3a3838] hover:text-white" onClick={() => { logout(); navigate("/"); }}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </Sidebar>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex min-h-18 items-center gap-4 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur sm:px-8">
            <SidebarTrigger className="min-h-11 min-w-11 rounded-xl hover:bg-secondary md:hidden" />
            <div className="min-w-0">
              <p className="aion-eyebrow">Aion Consultoria</p>
              <h1 className="truncate text-lg font-extrabold tracking-[-0.03em] sm:text-xl">{activeLabel}</h1>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="relative" ref={alertsMenuRef}>
                  <Button type="button" variant="outline" size="icon" aria-expanded={alertsOpen} aria-controls="aion-alerts-menu" onClick={() => setAlertsOpen((open) => !open)} aria-label={`Abrir alertas${unreadAlerts.length ? `: ${unreadAlerts.length} não lido(s)` : ""}`} title="Alertas" className="relative h-11 w-11 rounded-full border-[#d9cfca] bg-white text-[#2d2d2d] shadow-sm transition hover:border-primary hover:bg-accent hover:text-primary">
                    <BellRing className="h-[1.05rem] w-[1.05rem]" />
                    {unreadAlerts.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-extrabold text-white ring-2 ring-background" aria-hidden="true">{unreadAlerts.length > 9 ? "9+" : unreadAlerts.length}</span>}
                  </Button>
                {alertsOpen && <div id="aion-alerts-menu" role="dialog" aria-label="Alertas e aportes" className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[22rem] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl sm:w-[25rem]">
                  <div className="border-b border-border px-5 py-4"><p className="font-extrabold">Alertas e aportes</p><p className="mt-0.5 text-xs text-muted-foreground">O que merece atenção agora.</p></div>
                  {activeClientId ? <div className="max-h-[min(60vh,34rem)] overflow-y-auto">
                    <section className="px-5 py-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-extrabold uppercase tracking-[.13em] text-muted-foreground">Alertas recentes</p>{unreadAlerts.length > 0 && <span className="rounded-full bg-[#f9e8eb] px-2 py-0.5 text-[0.65rem] font-extrabold text-primary">{unreadAlerts.length} novo(s)</span>}</div><div className="mt-3 space-y-2">{alerts.slice(0, 3).map((alert) => <div key={alert.id} className="rounded-xl bg-secondary/70 px-3.5 py-3"><div className="flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${alert.read ? "bg-[#b8b0aa]" : "bg-primary"}`} /><span className="min-w-0"><span className="block truncate text-sm font-bold">{alert.title}</span><span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{alert.message || "Acompanhe este item pela central de alertas."}</span></span></div></div>)}{!alerts.length && <p className="rounded-xl bg-secondary/60 px-3.5 py-4 text-sm text-muted-foreground">Não há alertas financeiros recentes.</p>}</div></section>
                    <section className="border-t border-border px-5 py-4"><p className="text-xs font-extrabold uppercase tracking-[.13em] text-muted-foreground">Aportes deste mês</p><div className="mt-3 space-y-2">{monthlyContributions.map((contribution) => <div key={contribution.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3"><span className="min-w-0"><span className="flex items-center gap-2 truncate text-sm font-bold"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: contribution.goalColor }} />{contribution.goalName}</span><span className="mt-0.5 block text-xs text-muted-foreground">{contribution.note || contributionDate(contribution.createdAt)}</span></span><span className="shrink-0 text-sm font-extrabold">{money(contribution.amount)}</span></div>)}{!monthlyContributions.length && <p className="rounded-xl bg-secondary/60 px-3.5 py-4 text-sm text-muted-foreground">Nenhum aporte foi registrado neste mês.</p>}</div></section>
                    <div className="flex gap-2 border-t border-border p-3"><Button variant="outline" size="sm" className="flex-1" onClick={() => { setAlertsOpen(false); navigate(contextualHref("/notificacoes")); }}>Ver alertas</Button><Button size="sm" className="flex-1" onClick={() => { setAlertsOpen(false); navigate(contextualHref("/metas")); }}>Abrir metas</Button></div>
                  </div> : <div className="px-5 py-6 text-sm text-muted-foreground">Abra a visão de um cliente para consultar os alertas e os aportes das suas metas.</div>}
                </div>}
              </div>
              <div className="hidden min-w-0 items-center gap-2.5 sm:flex">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#363636] text-sm font-extrabold text-white">
                  {(user?.name ?? "A").trim().slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block max-w-36 truncate text-sm font-extrabold">{user?.name ?? "Conta Aion"}</span>
                  <span className="block text-xs text-muted-foreground">{isConsultor ? "Consultor Aion" : isPersonal ? "Pessoal / Família" : "Microempresário"}</span>
                </span>
              </div>
            </div>
          </header>
          <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
