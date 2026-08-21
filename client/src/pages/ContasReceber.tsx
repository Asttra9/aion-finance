import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import AionDashboardLayout from "@/components/AionDashboardLayout";
import { toast } from "sonner";

const emptyForm = () => ({ description: "", amount: "", dueDate: new Date().toISOString().slice(0, 10), customer: "", invoiceNumber: "" });

export default function ContasReceber() {
  const [location] = useLocation();
  const clientId = Number(location.split("/")[2]) || undefined;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const query = trpc.accountsReceivable.list.useQuery({ clientId: clientId || 0 }, { enabled: !!clientId });
  const utils = trpc.useUtils();
  const invalidate = () => void utils.accountsReceivable.list.invalidate({ clientId });
  const createMutation = trpc.accountsReceivable.create.useMutation({ onSuccess: () => { invalidate(); setOpen(false); setFormData(emptyForm()); toast.success("Conta a receber criada."); }, onError: (error) => toast.error(error.message) });
  const updateMutation = trpc.accountsReceivable.update.useMutation({ onSuccess: () => { invalidate(); setOpen(false); setEditingId(null); setFormData(emptyForm()); toast.success("Conta a receber atualizada."); }, onError: (error) => toast.error(error.message) });
  const statusMutation = trpc.accountsReceivable.updateStatus.useMutation({ onSuccess: () => { invalidate(); toast.success("Status atualizado."); }, onError: (error) => toast.error(error.message) });
  const deleteMutation = trpc.accountsReceivable.delete.useMutation({ onSuccess: () => { invalidate(); toast.success("Conta excluída."); }, onError: (error) => toast.error(error.message) });

  const accounts = query.data ?? [];
  const pending = useMemo(() => accounts.filter((item) => item.status === "pendente"), [accounts]);
  const overdue = useMemo(() => accounts.filter((item) => item.status === "vencido" || (item.status === "pendente" && new Date(item.dueDate) < new Date())), [accounts]);
  const received = useMemo(() => accounts.filter((item) => item.status === "pago"), [accounts]);
  const total = (items: typeof accounts) => items.reduce((sum, item) => sum + Number(item.amount), 0);

  const openCreate = () => { setEditingId(null); setFormData(emptyForm()); setOpen(true); };
  const openEdit = (account: (typeof accounts)[number]) => { setEditingId(account.id); setFormData({ description: account.description, amount: String(account.amount), dueDate: new Date(account.dueDate).toISOString().slice(0, 10), customer: account.customer ?? "", invoiceNumber: account.invoiceNumber ?? "" }); setOpen(true); };
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault(); if (!clientId) return;
    const common = { description: formData.description, amount: formData.amount, dueDate: new Date(formData.dueDate), customer: formData.customer || undefined, invoiceNumber: formData.invoiceNumber || undefined };
    if (editingId) updateMutation.mutate({ arId: editingId, ...common }); else createMutation.mutate({ clientId, ...common });
  };

  if (!clientId) return <AionDashboardLayout><p className="text-muted-foreground">Selecione um cliente para acessar as contas a receber.</p></AionDashboardLayout>;
  const saving = createMutation.isPending || updateMutation.isPending;
  return <AionDashboardLayout><div className="space-y-6"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">AION · Recebíveis</p><h1 className="mt-2 text-3xl font-bold">Contas a receber</h1><p className="mt-1 text-muted-foreground">Acompanhe recebimentos, vencimentos e cobranças.</p></div><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova conta</Button></div>
    <div className="grid gap-4 md:grid-cols-3"><Card><CardHeader className="pb-2"><CardDescription>Pendentes</CardDescription><CardTitle>R$ {total(pending).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{pending.length} conta(s)</CardContent></Card><Card><CardHeader className="pb-2"><CardDescription>Vencidas</CardDescription><CardTitle className="text-rose-700">R$ {total(overdue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Acione a cobrança</CardContent></Card><Card><CardHeader className="pb-2"><CardDescription>Recebidas</CardDescription><CardTitle className="text-emerald-700">R$ {total(received).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Histórico confirmado</CardContent></Card></div>
    <Card><CardHeader><CardTitle>Todas as contas</CardTitle><CardDescription>Edite, marque como recebido ou exclua registros.</CardDescription></CardHeader><CardContent>{query.isLoading ? <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div> : accounts.length === 0 ? <div className="py-10 text-center"><CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" /><p className="mb-4 text-muted-foreground">Nenhuma conta a receber registrada.</p><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Registrar conta</Button></div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Vencimento</TableHead><TableHead>Descrição</TableHead><TableHead>Cliente</TableHead><TableHead>NF</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{accounts.map((account) => { const isOverdue = account.status === "vencido" || (account.status === "pendente" && new Date(account.dueDate) < new Date()); return <TableRow key={account.id} className={isOverdue ? "bg-rose-50/70" : undefined}><TableCell>{new Date(account.dueDate).toLocaleDateString("pt-BR")}</TableCell><TableCell>{account.description}</TableCell><TableCell>{account.customer || "—"}</TableCell><TableCell>{account.invoiceNumber || "—"}</TableCell><TableCell className="font-semibold">R$ {Number(account.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell><TableCell><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${account.status === "pago" ? "bg-emerald-100 text-emerald-800" : isOverdue ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{isOverdue && <AlertCircle className="h-3 w-3" />}{account.status === "pago" ? "Recebido" : isOverdue ? "Vencido" : "Pendente"}</span></TableCell><TableCell><div className="flex justify-end gap-2">{account.status !== "pago" && <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ arId: account.id, status: "pago", paymentDate: new Date() })}>Marcar recebido</Button>}<Button size="icon" variant="ghost" aria-label="Editar conta" onClick={() => openEdit(account)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Excluir conta" onClick={() => { if (window.confirm("Excluir esta conta a receber?")) deleteMutation.mutate({ arId: account.id }); }} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 text-rose-600" /></Button></div></TableCell></TableRow>; })}</TableBody></Table></div>}</CardContent></Card>
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><span className="hidden" /></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{editingId ? "Editar conta a receber" : "Nova conta a receber"}</DialogTitle><DialogDescription>Registre o recebimento esperado.</DialogDescription></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><div className="space-y-2"><Label>Descrição</Label><Input required value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Valor</Label><Input required type="number" min="0" step="0.01" value={formData.amount} onChange={(event) => setFormData({ ...formData, amount: event.target.value })} /></div><div className="space-y-2"><Label>Vencimento</Label><Input required type="date" value={formData.dueDate} onChange={(event) => setFormData({ ...formData, dueDate: event.target.value })} /></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Cliente</Label><Input value={formData.customer} onChange={(event) => setFormData({ ...formData, customer: event.target.value })} /></div><div className="space-y-2"><Label>Número da NF</Label><Input value={formData.invoiceNumber} onChange={(event) => setFormData({ ...formData, invoiceNumber: event.target.value })} /></div></div><Button className="w-full" type="submit" disabled={saving}>{saving ? <><Spinner className="mr-2 h-4 w-4" />Salvando</> : editingId ? "Salvar alterações" : "Criar conta"}</Button></form></DialogContent></Dialog>
  </div></AionDashboardLayout>;
}
