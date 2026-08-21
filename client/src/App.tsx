import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Clientes from "@/pages/Clientes";
import Dashboard from "@/pages/Dashboard";
import Transacoes from "@/pages/Transacoes";
import ContasPagar from "@/pages/ContasPagar";
import ContasReceber from "@/pages/ContasReceber";
import Relatorios from "@/pages/Relatorios";
import MeiWorkflow from "@/pages/MeiWorkflow";
import Conciliacao from "@/pages/Conciliacao";
import Notificacoes from "@/pages/Notificacoes";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";

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
        <Route path="/" component={Home} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/clientes" component={Clientes} />
      <Route path="/clientes/:id/dashboard" component={Dashboard} />
      <Route path="/clientes/:id/transacoes" component={Transacoes} />
      <Route path="/clientes/:id/contas-pagar" component={ContasPagar} />
      <Route path="/clientes/:id/contas-receber" component={ContasReceber} />
      <Route path="/clientes/:id/relatorios" component={Relatorios} />
      <Route path="/clientes/:id/mei-workflow" component={MeiWorkflow} />
      <Route path="/clientes/:id/conciliacao" component={Conciliacao} />
      <Route path="/clientes/:id/notificacoes" component={Notificacoes} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/transacoes" component={Transacoes} />
      <Route path="/contas-pagar" component={ContasPagar} />
      <Route path="/contas-receber" component={ContasReceber} />
      <Route path="/relatorios" component={Relatorios} />
      <Route path="/mei-workflow" component={MeiWorkflow} />
      <Route path="/conciliacao" component={Conciliacao} />
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
