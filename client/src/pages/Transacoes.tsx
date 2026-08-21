import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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
    const transactionDate = new Date(t.date);
    const isTypeMatch = filterType === "todas" || t.type === filterType;
    const isCategoryMatch = categoryFilter === "todas" || t.categoryId === Number(categoryFilter);
    const isAfterStart = !periodStart || transactionDate >= new Date(`${periodStart}T00:00:00`);
    const isBeforeEnd = !periodEnd || transactionDate <= new Date(`${periodEnd}T23:59:59`);
    return isTypeMatch && isCategoryMatch && isAfterStart && isBeforeEnd;
  }) || [];

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "receita")
    .reduce((sum, t) => sum + parseFloat(t.amount as any), 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === "despesa")
    .reduce((sum, t) => sum + parseFloat(t.amount as any), 0);
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedTransactions = filteredTransactions.slice(pageStart, pageStart + pageSize);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => totalPages <= 5 || page === 1 || page === totalPages || Math.abs(page - safePage) <= 1);

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

        <Card className="border-border bg-card">
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
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <CardTitle>Histórico de Transações</CardTitle>
                <CardDescription>
                  Aplique filtros para analisar lançamentos por contexto, período e categoria.
                </CardDescription>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:items-center">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground xl:mr-1"><Filter className="h-4 w-4" /><span>Filtros</span></div>
                <Select value={filterType} onValueChange={(value: "todas" | "receita" | "despesa") => { setFilterType(value); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full xl:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="receita">Receitas</SelectItem>
                    <SelectItem value="despesa">Despesas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full xl:w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent><SelectItem value="todas">Categorias</SelectItem>{categoriesQuery.data?.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input aria-label="Data inicial" type="date" value={periodStart} onChange={(event) => { setPeriodStart(event.target.value); setCurrentPage(1); }} className="w-full xl:w-36" />
                <Input aria-label="Data final" type="date" value={periodEnd} onChange={(event) => { setPeriodEnd(event.target.value); setCurrentPage(1); }} className="w-full xl:w-36" />
                {(filterType !== "todas" || categoryFilter !== "todas" || periodStart || periodEnd) && <Button variant="ghost" size="sm" onClick={() => { setFilterType("todas"); setCategoryFilter("todas"); setPeriodStart(""); setPeriodEnd(""); setCurrentPage(1); }}>Limpar</Button>}
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
                    {paginatedTransactions.map((transaction) => (
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
                {totalPages > 1 && <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">Exibindo {pageStart + 1}–{Math.min(pageStart + pageSize, filteredTransactions.length)} de {filteredTransactions.length} lançamentos</p><Pagination aria-label="Paginação de transações" className="mx-0 w-auto sm:ml-auto"><PaginationContent><PaginationItem><Button variant="ghost" size="sm" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1} aria-label="Página anterior"><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button></PaginationItem>{pageNumbers.map((page, index) => <PaginationItem key={page}>{index > 0 && pageNumbers[index - 1] !== page - 1 ? <span className="px-1 text-muted-foreground" aria-hidden="true">…</span> : null}<Button variant={page === safePage ? "outline" : "ghost"} size="icon" onClick={() => setCurrentPage(page)} aria-label={`Ir para a página ${page}`} aria-current={page === safePage ? "page" : undefined}>{page}</Button></PaginationItem>)}<PaginationItem><Button variant="ghost" size="sm" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages} aria-label="Próxima página">Próxima<ChevronRight className="ml-1 h-4 w-4" /></Button></PaginationItem></PaginationContent></Pagination></div>}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Nenhuma transação encontrada para os filtros selecionados
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
