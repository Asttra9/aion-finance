import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCpfCnpj, isValidCpfCnpj, normalizeCpfCnpj } from "@shared/brazilianDocument";

type EditableClient = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  cpfCnpj?: string | null;
  businessType: "pessoal" | "mei" | "profissional_liberal" | "pj";
  businessName?: string | null;
  serviceModel?: "recorrente" | "pontual" | null;
  monthlyRevenue?: string | null;
  notes?: string | null;
  status: "ativo" | "inativo" | "em_onboarding";
};

type ClientDraft = {
  name: string;
  email: string;
  phone: string;
  address: string;
  cpfCnpj: string;
  businessName: string;
  serviceModel: "recorrente" | "pontual" | "nao-informado";
  monthlyRevenue: string;
  notes: string;
  status: "ativo" | "inativo" | "em_onboarding";
};

const emptyToNull = (value: string) => value.trim() || null;
const journeyLabel: Record<EditableClient["businessType"], string> = {
  pessoal: "Cliente pessoal",
  mei: "MEI",
  profissional_liberal: "Profissional liberal",
  pj: "Pessoa jurídica",
};

function makeDraft(client: EditableClient): ClientDraft {
  return {
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    address: client.address ?? "",
    cpfCnpj: client.cpfCnpj ?? "",
    businessName: client.businessName ?? "",
    serviceModel: client.serviceModel ?? "nao-informado",
    monthlyRevenue: client.monthlyRevenue ?? "",
    notes: client.notes ?? "",
    status: client.status,
  };
}

export function ClientEditDialog({ client, open, onOpenChange }: { client: EditableClient; open: boolean; onOpenChange: (open: boolean) => void }) {
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<ClientDraft>(() => makeDraft(client));
  const updateClient = trpc.clients.update.useMutation({
    onSuccess: async () => {
      await utils.clients.list.invalidate();
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) setDraft(makeDraft(client));
  }, [client, open]);

  const updateDraft = <Key extends keyof ClientDraft>(key: Key, value: ClientDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const hasDocument = normalizeCpfCnpj(draft.cpfCnpj).length > 0;
  const documentIsValid = !hasDocument || isValidCpfCnpj(draft.cpfCnpj);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!documentIsValid) return;
    updateClient.mutate({
      clientId: client.id,
      name: draft.name.trim(),
      email: emptyToNull(draft.email),
      phone: emptyToNull(draft.phone),
      address: emptyToNull(draft.address),
      cpfCnpj: emptyToNull(normalizeCpfCnpj(draft.cpfCnpj)),
      businessName: emptyToNull(draft.businessName),
      serviceModel: draft.serviceModel === "nao-informado" ? null : draft.serviceModel,
      monthlyRevenue: emptyToNull(draft.monthlyRevenue),
      notes: emptyToNull(draft.notes),
      status: draft.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar cadastro do cliente</DialogTitle>
            <DialogDescription>Atualize os dados administrativos sem alterar a jornada financeira já definida.</DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid gap-5">
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Jornada financeira</p>
              <p className="mt-1 font-semibold text-foreground">{journeyLabel[client.businessType]}</p>
            </div>

            <section className="grid gap-4 sm:grid-cols-2" aria-labelledby="client-identification-title">
              <h3 id="client-identification-title" className="sm:col-span-2 text-sm font-semibold text-foreground">Identificação e contato</h3>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-client-name">Nome completo *</Label>
                <Input id="edit-client-name" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} minLength={2} maxLength={255} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-client-cpf-cnpj">CPF/CNPJ</Label>
                <Input
                  id="edit-client-cpf-cnpj"
                  value={draft.cpfCnpj}
                  onChange={(event) => updateDraft("cpfCnpj", formatCpfCnpj(event.target.value))}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  aria-invalid={!documentIsValid}
                  maxLength={18}
                />
                {hasDocument && !documentIsValid && <p className="text-xs font-medium text-destructive">Informe um CPF ou CNPJ válido.</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-client-phone">Telefone</Label>
                <Input id="edit-client-phone" value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} maxLength={20} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-client-email">E-mail</Label>
                <Input id="edit-client-email" type="email" value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} maxLength={320} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-client-address">Endereço físico</Label>
                <Textarea id="edit-client-address" value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} maxLength={800} rows={3} />
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2" aria-labelledby="client-service-title">
              <h3 id="client-service-title" className="sm:col-span-2 text-sm font-semibold text-foreground">Atendimento e acompanhamento</h3>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-client-business-name">Nome da empresa</Label>
                <Input id="edit-client-business-name" value={draft.businessName} onChange={(event) => updateDraft("businessName", event.target.value)} maxLength={255} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-client-service-model">Modalidade de atendimento</Label>
                <Select value={draft.serviceModel} onValueChange={(value) => updateDraft("serviceModel", value as ClientDraft["serviceModel"])}>
                  <SelectTrigger id="edit-client-service-model"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao-informado">Não informado</SelectItem>
                    <SelectItem value="recorrente">Recorrente</SelectItem>
                    <SelectItem value="pontual">Pontual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-client-status">Status</Label>
                <Select value={draft.status} onValueChange={(value) => updateDraft("status", value as ClientDraft["status"])}>
                  <SelectTrigger id="edit-client-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="em_onboarding">Em onboarding</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-client-monthly-revenue">Receita mensal estimada</Label>
                <Input id="edit-client-monthly-revenue" type="number" min="0" step="0.01" value={draft.monthlyRevenue} onChange={(event) => updateDraft("monthlyRevenue", event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-client-notes">Observações</Label>
                <Textarea id="edit-client-notes" value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} maxLength={2000} rows={3} />
              </div>
            </section>
          </div>

          {updateClient.error && <p role="alert" className="mt-4 text-sm text-destructive">{updateClient.error.message || "Não foi possível salvar as alterações."}</p>}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={updateClient.isPending}>{updateClient.isPending ? "Salvando..." : "Salvar alterações"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
