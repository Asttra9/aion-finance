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
import { Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import AionDashboardLayout from "@/components/AionDashboardLayout";
import { toast } from "sonner";

export default function ContasPagar() {
  const [location] = useLocation();
  const clientId = location.includes("/clientes/") 
    ? parseInt(location.split("/")[2])
    : undefined;

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    dueDate: new Date().toISOString().split("T")[0],
    vendor: "",
    category: "",
  });

  const { data: accounts, isLoading, refetch } = trpc.accountsPayable.list.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  const createMutation = trpc.accountsPayable.create.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Conta a pagar criada com sucesso!");
      setOpen(false);
      setFormData({
        description: "",
        amount: "",
        dueDate: new Date().toISOString().split("T")[0],
        vendor: "",
        category: "",
      });
    },
  });

  const updateStatusMutation = trpc.accountsPayable.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Status atualizado!");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;

    createMutation.mutate({
      clientId,
      description: formData.description,
      amount: formData.amount,
      dueDate: new Date(formData.dueDate),
      vendor: formData.vendor,
      category: formData.category,
    });
  };

  const pending = accounts?.filter((a) => a.status === "pendente") || [];
  const overdue = accounts?.filter((a) => a.status === "vencido") || [];
  const paid = accounts?.filter((a) => a.status === "pago") || [];

  const totalPending = pending.reduce((sum, a) => sum + parseFloat(a.amount as any), 0);
  const totalOverdue = overdue.reduce((sum, a) => sum + parseFloat(a.amount as any), 0);

  return (
    <AionDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Contas a Pagar</h2>
            <p className="text-muted-foreground mt-1">
              Gerencie seus compromissos financeiros
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Conta a Pagar</DialogTitle>
                <DialogDescription>
                  Registre um novo compromisso financeiro
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
                  <Label htmlFor="dueDate">Data de Vencimento *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor">Fornecedor</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
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
                    "Criar Conta"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {totalPending.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {pending.length} conta(s)
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-900">
                Vencidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {totalOverdue.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-red-700 mt-1">
                {overdue.length} conta(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pagas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {paid.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                contas pagas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Todas as Contas</CardTitle>
            <CardDescription>
              Listagem completa de contas a pagar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : accounts && accounts.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data de Vencimento</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => {
                      const dueDate = new Date(account.dueDate);
                      const today = new Date();
                      const isOverdue =
                        dueDate < today && account.status === "pendente";

                      return (
                        <TableRow
                          key={account.id}
                          className={isOverdue ? "bg-red-50" : ""}
                        >
                          <TableCell>
                            {dueDate.toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>{account.description}</TableCell>
                          <TableCell>{account.vendor || "-"}</TableCell>
                          <TableCell>{account.category || "-"}</TableCell>
                          <TableCell className="text-right font-semibold">
                            R$ {parseFloat(account.amount as any).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isOverdue && (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              )}
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  account.status === "pago"
                                    ? "bg-green-100 text-green-800"
                                    : account.status === "vencido"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {account.status === "pago"
                                  ? "Pago"
                                  : account.status === "vencido"
                                  ? "Vencido"
                                  : "Pendente"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {account.status === "pendente" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    apId: account.id,
                                    status: "pago",
                                    paymentDate: new Date(),
                                  })
                                }
                                disabled={updateStatusMutation.isPending}
                              >
                                Marcar Pago
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma conta a pagar!
                </p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Primeira Conta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AionDashboardLayout>
  );
}
