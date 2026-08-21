import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Filter } from "lucide-react";
import { useLocation } from "wouter";
import AionDashboardLayout from "@/components/AionDashboardLayout";

export default function Transacoes() {
  const [location] = useLocation();
  const clientId = location.includes("/clientes/") 
    ? parseInt(location.split("/")[2])
    : undefined;

  const [open, setOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<"receita" | "despesa">("despesa");
  const [categoryIsFixed, setCategoryIsFixed] = useState(false);
  const [filterType, setFilterType] = useState<"todas" | "receita" | "despesa">("todas");
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    type: "despesa" as const,
    financeType: "empresarial" as const,
    date: new Date().toISOString().split("T")[0],
  });

  const { data: transactions, isLoading, refetch } = trpc.transactions.list.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );
  const categoriesQuery = trpc.transactions.categoriesForClient.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );
  const createCategoryMutation = trpc.transactions.createCategory.useMutation({
    onSuccess: () => {
      categoriesQuery.refetch();
      setCategoryOpen(false);
      setCategoryName("");
      setCategoryType("despesa");
      setCategoryIsFixed(false);
    },
  });
  const updateCategoryMutation = trpc.transactions.updateCategory.useMutation({
    onSuccess: () => categoriesQuery.refetch(),
  });

  const createMutation = trpc.transactions.create.useMutation({
    onSuccess: () => {
      refetch();
      setOpen(false);
      setFormData({
        description: "",
        amount: "",
        type: "despesa",
        financeType: "empresarial",
        date: new Date().toISOString().split("T")[0],
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    
    createMutation.mutate({
      clientId,
      description: formData.description,
      amount: formData.amount,
      type: formData.type,
      financeType: formData.financeType,
      date: new Date(formData.date),
    });
  };

  const filteredTransactions = transactions?.filter((t) => {
    if (filterType === "todas") return true;
    return t.type === filterType;
  }) || [];

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "receita")
    .reduce((sum, t) => sum + parseFloat(t.amount as any), 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === "despesa")
    .reduce((sum, t) => sum + parseFloat(t.amount as any), 0);

  return (
    <AionDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Transações</h2>
            <p className="text-muted-foreground mt-1">
              Gerencie todas as transações financeiras
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Nova Transação</DialogTitle>
                <DialogDescription>
                  Registre uma nova receita ou despesa
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Valor *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita">Receita</SelectItem>
                      <SelectItem value="despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="financeType">Tipo de Finanças</Label>
                  <Select
                    value={formData.financeType}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, financeType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresarial">Empresarial</SelectItem>
                      <SelectItem value="pessoal">Pessoal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full"
                >
                  {createMutation.isPending ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Criando...
                    </>
                  ) : (
                    "Criar Transação"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-[#e5dfda] bg-[#fdfcfa]">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">Categorias e custos fixos</CardTitle>
              <CardDescription className="mt-1">Marque despesas recorrentes para tornar o ponto de equilíbrio mais preciso.</CardDescription>
            </div>
            <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
              <DialogTrigger asChild><Button variant="outline" size="sm">Nova categoria</Button></DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Nova categoria financeira</DialogTitle><DialogDescription>Crie uma classificação para organizar os lançamentos.</DialogDescription></DialogHeader>
                <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); createCategoryMutation.mutate({ name: categoryName, type: categoryType, isFixedCost: categoryType === "despesa" && categoryIsFixed }); }}>
                  <div className="space-y-2"><Label htmlFor="category-name">Nome</Label><Input id="category-name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required /></div>
                  <div className="space-y-2"><Label>Tipo</Label><Select value={categoryType} onValueChange={(value) => setCategoryType(value as "receita" | "despesa")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="despesa">Despesa</SelectItem><SelectItem value="receita">Receita</SelectItem></SelectContent></Select></div>
                  {categoryType === "despesa" && <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-sm font-medium"><input type="checkbox" checked={categoryIsFixed} onChange={(event) => setCategoryIsFixed(event.target.checked)} /> Custo fixo recorrente</label>}
                  <Button type="submit" className="w-full" disabled={createCategoryMutation.isPending}>{createCategoryMutation.isPending ? "Criando..." : "Criar categoria"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categoriesQuery.data?.filter((category) => category.type === "despesa").map((category) => <label key={category.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium"><input type="checkbox" checked={Boolean(category.isFixedCost)} onChange={(event) => updateCategoryMutation.mutate({ categoryId: category.id, isFixedCost: event.target.checked })} disabled={updateCategoryMutation.isPending} />{category.name}</label>)}
            {!categoriesQuery.data?.length && <p className="text-sm text-muted-foreground">Cadastre categorias para organizar os indicadores e o ponto de equilíbrio.</p>}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Receitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {totalIncome.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {totalExpense.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  totalIncome - totalExpense >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                R$ {(totalIncome - totalExpense).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Histórico de Transações</CardTitle>
                <CardDescription>
                  Lista de todas as transações registradas
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="receita">Receitas</SelectItem>
                    <SelectItem value="despesa">Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : filteredTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Finanças</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.date).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              transaction.type === "receita"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {transaction.type === "receita" ? "Receita" : "Despesa"}
                          </span>
                        </TableCell>
                        <TableCell className="capitalize">
                          {transaction.financeType}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span
                            className={
                              transaction.type === "receita"
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {transaction.type === "receita" ? "+" : "-"}
                            R$ {parseFloat(transaction.amount as any).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              transaction.status === "conciliado"
                                ? "bg-blue-100 text-blue-800"
                                : transaction.status === "pendente"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {transaction.status.charAt(0).toUpperCase() +
                              transaction.status.slice(1)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Nenhuma transação registrada
                </p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Primeira Transação
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AionDashboardLayout>
  );
}
