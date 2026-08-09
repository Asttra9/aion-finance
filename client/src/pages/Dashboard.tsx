import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import AionDashboardLayout from "@/components/AionDashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [location] = useLocation();
  
  // Extract clientId from URL if present (for consultant viewing client dashboard)
  const clientId = location.includes("/clientes/") 
    ? parseInt(location.split("/")[2])
    : undefined;

  const { data: client } = trpc.clients.get.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId && user?.role === "consultor_aion" }
  );

  const { data: transactions, isLoading: transactionsLoading } =
    trpc.transactions.list.useQuery(
      { clientId: clientId || 0 },
      { enabled: !!clientId }
    );

  const { data: accountsPayable } = trpc.accountsPayable.list.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  const { data: accountsReceivable } = trpc.accountsReceivable.list.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  // Calculate financial metrics
  const metrics = useMemo(() => {
    if (!transactions) return null;

    const totalIncome = transactions
      .filter((t) => t.type === "receita")
      .reduce((sum, t) => sum + parseFloat(t.amount as any), 0);

    const totalExpense = transactions
      .filter((t) => t.type === "despesa")
      .reduce((sum, t) => sum + parseFloat(t.amount as any), 0);

    const netCashFlow = totalIncome - totalExpense;
    const grossMargin = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    // Calculate break-even point (simplified)
    const monthlyExpense = totalExpense;
    const breakEvenPoint = monthlyExpense;

    // Prepare weekly cash flow data
    const today = new Date();
    const weekData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        return (
          tDate.getDate() === date.getDate() &&
          tDate.getMonth() === date.getMonth() &&
          tDate.getFullYear() === date.getFullYear()
        );
      });

      const dayIncome = dayTransactions
        .filter((t) => t.type === "receita")
        .reduce((sum, t) => sum + parseFloat(t.amount as any), 0);

      const dayExpense = dayTransactions
        .filter((t) => t.type === "despesa")
        .reduce((sum, t) => sum + parseFloat(t.amount as any), 0);

      weekData.push({
        date: date.toLocaleDateString("pt-BR", { weekday: "short", month: "short", day: "numeric" }),
        receita: dayIncome,
        despesa: dayExpense,
      });
    }

    // Category breakdown
    const categoryData = transactions.reduce(
      (acc, t) => {
        const existing = acc.find((c) => c.name === (t.description || "Sem categoria"));
        if (existing) {
          existing.value += parseFloat(t.amount as any);
        } else {
          acc.push({
            name: t.description || "Sem categoria",
            value: parseFloat(t.amount as any),
          });
        }
        return acc;
      },
      [] as Array<{ name: string; value: number }>
    );

    return {
      totalIncome,
      totalExpense,
      netCashFlow,
      grossMargin,
      breakEvenPoint,
      weekData,
      categoryData: categoryData.slice(0, 5), // Top 5 categories
    };
  }, [transactions]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  if (transactionsLoading) {
    return (
      <AionDashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Spinner className="w-8 h-8" />
        </div>
      </AionDashboardLayout>
    );
  }

  return (
    <AionDashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {clientId && client ? `Dashboard - ${client.name}` : "Meu Dashboard Financeiro"}
          </h2>
          <p className="text-muted-foreground mt-1">
            Visão geral da saúde financeira
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {(metrics?.totalIncome || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Últimas transações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesa Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {(metrics?.totalExpense || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Últimas transações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Fluxo de Caixa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  (metrics?.netCashFlow || 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                R$ {(metrics?.netCashFlow || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Receita - Despesa
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Margem Bruta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(metrics?.grossMargin || 0).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                (Receita - Despesa) / Receita
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Cash Flow */}
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa - Últimos 7 Dias</CardTitle>
              <CardDescription>
                Receitas e despesas por dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics?.weekData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="receita" fill="#10b981" name="Receita" />
                  <Bar dataKey="despesa" fill="#ef4444" name="Despesa" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Categoria</CardTitle>
              <CardDescription>
                Top 5 categorias de transações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics?.categoryData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) =>
                      `${name}: R$ ${value.toFixed(2)}`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(metrics?.categoryData || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* DRE Simplificado */}
        <Card>
          <CardHeader>
            <CardTitle>DRE Simplificado</CardTitle>
            <CardDescription>
              Demonstrativo de Resultados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span>Receita Total</span>
                <span className="font-semibold">
                  R$ {(metrics?.totalIncome || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>(-) Despesa Total</span>
                <span className="font-semibold">
                  R$ {(metrics?.totalExpense || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between py-2 bg-green-50 px-3 rounded">
                <span className="font-semibold">Resultado Líquido</span>
                <span className="font-bold text-green-600">
                  R$ {(metrics?.netCashFlow || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span>Margem Bruta</span>
                <span className="font-semibold">
                  {(metrics?.grossMargin || 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contas a Pagar/Receber Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contas a Pagar</CardTitle>
              <CardDescription>
                Próximos vencimentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accountsPayable && accountsPayable.length > 0 ? (
                <div className="space-y-2">
                  {accountsPayable.slice(0, 5).map((ap) => (
                    <div key={ap.id} className="flex justify-between py-2 border-b">
                      <div>
                        <p className="text-sm font-medium">{ap.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Vence em: {new Date(ap.dueDate).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span className="font-semibold">
                        R$ {parseFloat(ap.amount as any).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Nenhuma conta a pagar
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contas a Receber</CardTitle>
              <CardDescription>
                Próximos recebimentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accountsReceivable && accountsReceivable.length > 0 ? (
                <div className="space-y-2">
                  {accountsReceivable.slice(0, 5).map((ar) => (
                    <div key={ar.id} className="flex justify-between py-2 border-b">
                      <div>
                        <p className="text-sm font-medium">{ar.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Vence em: {new Date(ar.dueDate).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span className="font-semibold">
                        R$ {parseFloat(ar.amount as any).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Nenhuma conta a receber
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AionDashboardLayout>
  );
}
