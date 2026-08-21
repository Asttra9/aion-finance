import { useState } from "react";
import { ArrowUpRight, Edit2, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AionDashboardLayout from "@/components/AionDashboardLayout";
import { ClientEditDialog } from "@/components/ClientEditDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  cpfCnpj: "",
  businessType: "pessoal" as const,
  businessName: "",
  serviceModel: undefined as "recorrente" | "pontual" | undefined,
  monthlyRevenue: "",
};

const businessTypeLabel = (businessType: string) => {
  if (businessType === "pessoal") return "Pessoal";
  if (businessType === "profissional_liberal") return "Profissional liberal";
  if (businessType === "pj") return "Pessoa jurídica";
  return businessType.toUpperCase();
};

export default function Clientes() {
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const { data: clients, isLoading, refetch } = trpc.clients.list.useQuery();
  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      refetch();
      setCreateOpen(false);
      setFormData(initialFormData);
    },
  });
  const editingClient = clients?.find((client) => client.id === editingClientId);

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate({
      name: formData.name.trim(),
      businessType: formData.businessType,
      ...(formData.email.trim() ? { email: formData.email.trim() } : {}),
      ...(formData.phone.trim() ? { phone: formData.phone.trim() } : {}),
      ...(formData.address.trim() ? { address: formData.address.trim() } : {}),
      ...(formData.cpfCnpj.trim() ? { cpfCnpj: formData.cpfCnpj.trim() } : {}),
      ...(formData.businessName.trim() ? { businessName: formData.businessName.trim() } : {}),
      ...(formData.serviceModel ? { serviceModel: formData.serviceModel } : {}),
      ...(formData.monthlyRevenue.trim() ? { monthlyRevenue: formData.monthlyRevenue } : {}),
    });
  };

  return (
    <AionDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
            <p className="mt-1 text-muted-foreground">Acompanhe clientes pessoais, MEIs e microempresas em jornadas financeiras próprias.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo cliente</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar novo cliente</DialogTitle>
                <DialogDescription>Cadastre o cliente para começar o acompanhamento financeiro.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço físico</Label>
                  <Input id="address" value={formData.address} onChange={(event) => setFormData({ ...formData, address: event.target.value })} maxLength={800} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                  <Input id="cpfCnpj" value={formData.cpfCnpj} onChange={(event) => setFormData({ ...formData, cpfCnpj: event.target.value })} maxLength={20} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Jornada financeira *</Label>
                  <Select value={formData.businessType} onValueChange={(value) => setFormData({ ...formData, businessType: value as typeof formData.businessType })}>
                    <SelectTrigger id="businessType"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pessoal">Cliente pessoal</SelectItem>
                      <SelectItem value="mei">MEI</SelectItem>
                      <SelectItem value="profissional_liberal">Profissional liberal</SelectItem>
                      <SelectItem value="pj">Pessoa jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nome da empresa</Label>
                  <Input id="businessName" value={formData.businessName} onChange={(event) => setFormData({ ...formData, businessName: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceModel">Modalidade de atendimento</Label>
                  <Select value={formData.serviceModel ?? "nao-informado"} onValueChange={(value) => setFormData({ ...formData, serviceModel: value === "nao-informado" ? undefined : value as "recorrente" | "pontual" })}>
                    <SelectTrigger id="serviceModel"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao-informado">Não informado</SelectItem>
                      <SelectItem value="recorrente">Recorrente</SelectItem>
                      <SelectItem value="pontual">Pontual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyRevenue">Receita mensal estimada</Label>
                  <Input id="monthlyRevenue" type="number" min="0" step="0.01" value={formData.monthlyRevenue} onChange={(event) => setFormData({ ...formData, monthlyRevenue: event.target.value })} />
                </div>
                {createMutation.error && <p role="alert" className="text-sm text-destructive">{createMutation.error.message || "Não foi possível criar o cliente."}</p>}
                <Button type="submit" disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? <><Spinner className="mr-2 h-4 w-4" />Criando...</> : "Criar cliente"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seus clientes</CardTitle>
            <CardDescription>Consulte o painel financeiro ou atualize os dados de cadastro de cada cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Spinner className="h-6 w-6" /></div>
            ) : clients && clients.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Tipo</TableHead><TableHead>Atendimento</TableHead><TableHead>Receita mensal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.email || "—"}</TableCell>
                        <TableCell>{businessTypeLabel(client.businessType)}</TableCell>
                        <TableCell>{client.serviceModel ? client.serviceModel.charAt(0).toUpperCase() + client.serviceModel.slice(1) : "Não informado"}</TableCell>
                        <TableCell>{client.monthlyRevenue ? Number(client.monthlyRevenue).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</TableCell>
                        <TableCell><span className="text-sm font-medium">{client.status === "em_onboarding" ? "Em onboarding" : client.status.charAt(0).toUpperCase() + client.status.slice(1)}</span></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" aria-label={`Abrir painel de ${client.name}`} title="Abrir painel" onClick={() => navigate(`/clientes/${client.id}/dashboard`)}><ArrowUpRight className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" aria-label={`Editar cadastro de ${client.name}`} title="Editar cadastro" onClick={() => setEditingClientId(client.id)}><Edit2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center"><p className="mb-4 text-muted-foreground">Nenhum cliente cadastrado ainda.</p><Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Criar primeiro cliente</Button></div>
            )}
          </CardContent>
        </Card>

        {editingClient && <ClientEditDialog client={editingClient} open={editingClientId !== null} onOpenChange={(nextOpen) => { if (!nextOpen) setEditingClientId(null); }} />}
      </div>
    </AionDashboardLayout>
  );
}
