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
  UsersRound,
  WalletCards,
} from "lucide-react";
import { ReactNode } from "react";
import { useLocation } from "wouter";

interface AionDashboardLayoutProps { children: ReactNode; }

const AION_MARK_URL = "/manus-storage/aion-logo-dark_9a4b34db.png";

type Item = { label: string; href: string; icon: typeof ChartNoAxesCombined; };

export default function AionDashboardLayout({ children }: AionDashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const isConsultor = user?.role === "consultor_aion" || user?.role === "admin";
  const { data: linkedClient } = trpc.clients.me.useQuery(undefined, { enabled: !!user && !isConsultor });
  const isPersonal = linkedClient?.businessType === "pessoal";
  const isMei = linkedClient?.businessType === "mei";

  const consultantItems: Item[] = [
    { label: "Visão Aion", href: "/dashboard", icon: ChartNoAxesCombined },
    { label: "Clientes", href: "/clientes", icon: UsersRound },
    { label: "Conciliação", href: "/conciliacao", icon: ArrowRightLeft },
    { label: "Relatórios", href: "/relatorios", icon: FileBarChart2 },
    { label: "Alertas", href: "/notificacoes", icon: BellRing },
  ];

  const personalItems: Item[] = [
    { label: "Visão geral", href: "/dashboard", icon: ChartNoAxesCombined },
    { label: "Minhas contas", href: "/contas-pagar", icon: ReceiptText },
    { label: "Gastos e entradas", href: "/transacoes", icon: WalletCards },
    { label: "Relatórios", href: "/relatorios", icon: FileBarChart2 },
    { label: "Alertas", href: "/notificacoes", icon: BellRing },
  ];

  const businessItems: Item[] = [
    { label: "Visão do negócio", href: "/dashboard", icon: ChartNoAxesCombined },
    { label: "Fluxo de caixa", href: "/transacoes", icon: Landmark },
    { label: "Contas e obrigações", href: "/contas-pagar", icon: CalendarClock },
    { label: "Entradas", href: "/contas-receber", icon: CircleDollarSign },
    { label: "Relatórios", href: "/relatorios", icon: FileBarChart2 },
    { label: "Alertas", href: "/notificacoes", icon: BellRing },
    ...(isMei ? [{ label: "Jornada MEI", href: "/mei-workflow", icon: BriefcaseBusiness }] : []),
  ];

  const menuItems = isConsultor ? consultantItems : isPersonal ? personalItems : businessItems;
  const workspaceName = isConsultor ? "Consultor Aion" : isPersonal ? "Finanças pessoais" : "Gestão do negócio";
  const activeLabel = menuItems.find((item) => location === item.href)?.label ?? workspaceName;
  const contextClientId = location.match(/^\/clientes\/(\d+)/)?.[1];
  const contextualHref = (href: string) => {
    if (!contextClientId) return href;
    return href === "/dashboard" ? `/clientes/${contextClientId}/dashboard` : `/clientes/${contextClientId}${href}`;
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
            <button onClick={() => navigate("/dashboard")} className="flex min-h-11 w-full items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
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
          </header>
          <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
