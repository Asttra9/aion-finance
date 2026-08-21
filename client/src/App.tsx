import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Acesso from "@/pages/Acesso";
import Clientes from "@/pages/Clientes";
import Dashboard from "@/pages/Dashboard";
import Transacoes from "@/pages/Transacoes";
import ContasPagar from "@/pages/ContasPagar";
import ContasReceber from "@/pages/ContasReceber";
import Relatorios from "@/pages/Relatorios";
import MeiWorkflow from "@/pages/MeiWorkflow";
import Conciliacao from "@/pages/Conciliacao";
import Notificacoes from "@/pages/Notificacoes";
import Metas from "@/pages/Metas";
import Operacao from "@/pages/Operacao";
import Pessoal from "@/pages/Pessoal";
import Mei from "@/pages/Mei";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";
import { useEffect } from "react";
import { useLocation } from "wouter";

function AuthenticatedRoot() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isConsultor = user?.role === "consultor_aion" || user?.role === "admin";

  useEffect(() => {
    navigate("/dashboard");
  }, [isConsultor, navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  );
}

function Router() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Acesso} />
        <Route path="/acesso" component={Acesso} />
        <Route path="/apresentacao" component={Home} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={AuthenticatedRoot} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/pessoal" component={Pessoal} />
      <Route path="/mei" component={Mei} />
      <Route path="/negocio" component={Dashboard} />
      <Route path="/acesso" component={Acesso} />
      <Route path="/clientes" component={Clientes} />
      <Route path="/operacao" component={Operacao} />
      <Route path="/clientes/:id/dashboard" component={Dashboard} />
      <Route path="/clientes/:id/transacoes" component={Transacoes} />
      <Route path="/clientes/:id/contas-pagar" component={ContasPagar} />
      <Route path="/clientes/:id/contas-receber" component={ContasReceber} />
      <Route path="/clientes/:id/relatorios" component={Relatorios} />
      <Route path="/clientes/:id/metas" component={Metas} />
      <Route path="/clientes/:id/mei-workflow" component={MeiWorkflow} />
      <Route path="/clientes/:id/conciliacao" component={Conciliacao} />
      <Route path="/clientes/:id/notificacoes" component={Notificacoes} />
      <Route path="/transacoes" component={Transacoes} />
      <Route path="/contas-pagar" component={ContasPagar} />
      <Route path="/contas-receber" component={ContasReceber} />
      <Route path="/metas" component={Metas} />
      <Route path="/mei-workflow" component={MeiWorkflow} />
      <Route path="/notificacoes" component={Notificacoes} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
