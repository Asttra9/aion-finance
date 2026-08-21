import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut, Menu } from "lucide-react";
import { ReactNode } from "react";
import { useLocation } from "wouter";

interface AionDashboardLayoutProps {
  children: ReactNode;
}

export default function AionDashboardLayout({
  children,
}: AionDashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const isConsultor = user?.role === "consultor_aion" || user?.role === "admin";

  const menuItems = isConsultor 
    ? [
        { label: "Clientes", href: "/clientes" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Transações", href: "/transacoes" },
        { label: "Contas a Pagar", href: "/contas-pagar" },
        { label: "Contas a Receber", href: "/contas-receber" },
        { label: "Relatórios", href: "/relatorios" },
        { label: "MEI Workflow", href: "/mei-workflow" },
        { label: "Notificações", href: "/notificacoes" },
      ]
    : [
        { label: "Meu Dashboard", href: "/dashboard" },
        { label: "Minhas Transações", href: "/transacoes" },
        { label: "Meus Relatórios", href: "/relatorios" },
        { label: "Notificações", href: "/notificacoes" },
      ];

  return (
    <SidebarProvider>
    <div className="flex h-screen bg-background">
      <Sidebar className="border-r border-border">
        <SidebarHeader className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Aion Finance</span>
              <span className="text-xs text-muted-foreground">
                {isConsultor ? "Consultor Aion" : "Cliente"}
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  onClick={() => navigate(item.href)}
                  className="cursor-pointer"
                >
                  {item.label}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <div className="border-t border-border p-4 mt-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </Sidebar>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border bg-background px-6 py-4 flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-2xl font-bold text-foreground">
            {isConsultor
              ? "Gestão Financeira - Aion" 
              : "Meu Dashboard Financeiro"}
          </h1>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
    </SidebarProvider>
  );
}
