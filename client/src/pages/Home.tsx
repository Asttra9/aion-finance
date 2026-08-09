import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, Users, TrendingUp, Lock, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

/**
 * Landing page for Aion Finance
 * Shows features and calls to action for unauthenticated users
 */
export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
            <span className="text-white font-bold text-xl">Aion Finance</span>
          </div>
          <Button onClick={startLogin} className="bg-blue-600 hover:bg-blue-700">
            Entrar
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
            Gestão Financeira Profissional para MEIs e Profissionais Liberais
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Aion Finance oferece clareza e autoridade financeira através de dashboards inteligentes, 
            conciliação bancária automatizada e relatórios profissionais.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={startLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Começar Agora
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-800"
            >
              Saiba Mais
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Funcionalidades Principais
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Dashboard */}
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-white">Dashboard Inteligente</CardTitle>
              <CardDescription className="text-slate-400">
                Indicadores de lucratividade, margem e ponto de equilíbrio
              </CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300">
              Visualize a saúde financeira em tempo real com gráficos e métricas essenciais.
            </CardContent>
          </Card>

          {/* Conciliação */}
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition">
            <CardHeader>
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <CardTitle className="text-white">Conciliação Bancária</CardTitle>
              <CardDescription className="text-slate-400">
                Importação de extratos OFX e categorização automática
              </CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300">
              Sincronize seus extratos bancários e categorize transações com facilidade.
            </CardContent>
          </Card>

          {/* Contas */}
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Contas a Pagar/Receber</CardTitle>
              <CardDescription className="text-slate-400">
                Controle de vencimentos e alertas automáticos
              </CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300">
              Gerencie seus compromissos financeiros com lembretes inteligentes.
            </CardContent>
          </Card>

          {/* Relatórios */}
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-orange-400" />
              </div>
              <CardTitle className="text-white">Relatórios Profissionais</CardTitle>
              <CardDescription className="text-slate-400">
                Exportação em PDF com layout consultivo
              </CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300">
              Gere relatórios mensais de fluxo de caixa e DRE em segundos.
            </CardContent>
          </Card>

          {/* MEI Workflow */}
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition">
            <CardHeader>
              <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-red-400" />
              </div>
              <CardTitle className="text-white">Workflow de Abertura MEI</CardTitle>
              <CardDescription className="text-slate-400">
                Acompanhamento de etapas e documentos
              </CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300">
              Simplifique o processo de abertura de MEI com checklist integrado.
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition">
            <CardHeader>
              <div className="w-12 h-12 bg-indigo-600/20 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-indigo-400" />
              </div>
              <CardTitle className="text-white">Segurança e Conformidade</CardTitle>
              <CardDescription className="text-slate-400">
                LGPD compliant e criptografia de dados
              </CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300">
              Seus dados estão protegidos com os mais altos padrões de segurança.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-slate-800/50 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Por que escolher Aion Finance?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Zap className="w-6 h-6 text-blue-400 mt-1" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Rápido e Eficiente
                </h3>
                <p className="text-slate-400">
                  Economize horas em tarefas manuais de conciliação e relatórios.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-green-400 mt-1" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Insights Acionáveis
                </h3>
                <p className="text-slate-400">
                  Tome decisões baseadas em dados com análises profundas.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Users className="w-6 h-6 text-purple-400 mt-1" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Dois Perfis de Acesso
                </h3>
                <p className="text-slate-400">
                  Consultores com acesso total, clientes com visualização segura.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Lock className="w-6 h-6 text-indigo-400 mt-1" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Segurança em Primeiro Lugar
                </h3>
                <p className="text-slate-400">
                  Conformidade LGPD e criptografia end-to-end para seus dados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para transformar sua gestão financeira?
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Comece agora e experimente a clareza e autoridade financeira que Aion Finance oferece.
          </p>
            <Button 
            size="lg"
            onClick={startLogin}
            className="bg-white text-blue-600 hover:bg-slate-100"
          >
            Entrar na Plataforma
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400">
          <p>© 2026 Aion Finance. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
