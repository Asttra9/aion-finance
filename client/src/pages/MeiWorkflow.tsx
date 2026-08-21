import { useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Circle, FileUp, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import AionDashboardLayout from "@/components/AionDashboardLayout";
import { toast } from "sonner";

const MEI_STEPS = [
  { id: "1", name: "Preparação de documentos", description: "Reúna RG, CPF e comprovante de endereço." },
  { id: "2", name: "Acesso ao Portal", description: "Acesse o portal do Governo Federal." },
  { id: "3", name: "Preenchimento do formulário", description: "Preencha o formulário de registro MEI." },
  { id: "4", name: "Confirmação de dados", description: "Revise e confirme todos os dados." },
  { id: "5", name: "Geração do CNPJ", description: "Acompanhe a geração do CNPJ." },
  { id: "6", name: "Emissão do certificado", description: "Baixe o certificado de registro." },
  { id: "7", name: "Abertura de conta bancária", description: "Abra uma conta bancária empresarial." },
  { id: "8", name: "Finalização", description: "Registro completo e pronto para operar." },
];
const REQUIRED_DOCUMENTS = [
  { name: "RG", required: true },
  { name: "CPF", required: true },
  { name: "Comprovante de Endereço", required: true },
  { name: "Declaração de Imposto de Renda", required: false },
  { name: "Contrato Social (se aplicável)", required: false },
];

type Step = { step: string; completed: boolean; completedAt?: string };
type DocumentItem = { name: string; uploaded: boolean; uploadedAt?: string; fileKey?: string };

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
}

export default function MeiWorkflow() {
  const [location] = useLocation();
  const clientId = Number(location.split("/")[2]) || undefined;
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const workflowQuery = trpc.meiWorkflow.get.useQuery({ clientId: clientId || 0 }, { enabled: !!clientId });
  const filesQuery = trpc.files.list.useQuery({ clientId: clientId || 0 }, { enabled: !!clientId });
  const utils = trpc.useUtils();
  const updateMutation = trpc.meiWorkflow.updateStatus.useMutation({ onSuccess: () => { void utils.meiWorkflow.get.invalidate({ clientId }); toast.success("Workflow salvo."); }, onError: (error) => toast.error(error.message) });
  const uploadMutation = trpc.files.upload.useMutation({ onError: (error) => toast.error(error.message) });
  const workflow = workflowQuery.data;
  const steps = (workflow?.steps ?? []) as Step[];
  const documents = (workflow?.documents ?? []) as DocumentItem[];
  const completedSteps = useMemo(() => steps.filter((item) => item.completed).length, [steps]);
  const progress = Math.round((completedSteps / MEI_STEPS.length) * 100);

  const saveWorkflow = (nextSteps: Step[], nextDocuments: DocumentItem[] = documents) => {
    if (!clientId || !workflow) return;
    const status = nextSteps.length > 0 && nextSteps.every((item) => item.completed) ? "concluido" : nextSteps.some((item) => item.completed) ? "em_progresso" : "nao_iniciado";
    updateMutation.mutate({ clientId, status, steps: nextSteps, documents: nextDocuments });
  };
  const toggleStep = (stepId: string) => {
    const next = MEI_STEPS.map((item) => { const current = steps.find((step) => step.step === item.id); const completed = item.id === stepId ? !current?.completed : Boolean(current?.completed); return { step: item.id, completed, ...(completed ? { completedAt: current?.completedAt ?? new Date().toISOString() } : {}) }; });
    saveWorkflow(next);
  };
  const toggleDocument = (name: string) => {
    const next = REQUIRED_DOCUMENTS.map((item) => { const current = documents.find((document) => document.name === item.name); return { name: item.name, uploaded: item.name === name ? !current?.uploaded : Boolean(current?.uploaded), ...(current?.fileKey ? { fileKey: current.fileKey } : {}), ...(item.name === name && !current?.uploaded ? { uploadedAt: new Date().toISOString() } : current?.uploadedAt ? { uploadedAt: current.uploadedAt } : {}) }; });
    saveWorkflow(steps, next);
  };
  const uploadDocument = async (name: string, file?: File) => {
    if (!clientId || !file || !workflow) return;
    setUploadingDocument(name);
    try {
      const uploaded = await uploadMutation.mutateAsync({ clientId, fileName: file.name, contentBase64: await toBase64(file), fileType: "outro" });
      const next = REQUIRED_DOCUMENTS.map((item) => { const current = documents.find((document) => document.name === item.name); return item.name === name ? { name, uploaded: true, uploadedAt: new Date().toISOString(), fileKey: uploaded.fileKey } : { name: item.name, uploaded: Boolean(current?.uploaded), ...(current?.uploadedAt ? { uploadedAt: current.uploadedAt } : {}), ...(current?.fileKey ? { fileKey: current.fileKey } : {}) }; });
      saveWorkflow(steps, next);
      void utils.files.list.invalidate({ clientId });
      toast.success(`Documento de ${name} armazenado.`);
    } finally { setUploadingDocument(null); }
  };

  if (!clientId) return <AionDashboardLayout><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Selecione um cliente para acessar o workflow de MEI.</AlertDescription></Alert></AionDashboardLayout>;
  return <AionDashboardLayout><div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">AION · Kickstart</p><h1 className="mt-2 text-3xl font-bold">Abertura de MEI</h1><p className="mt-1 text-muted-foreground">Acompanhe etapas e documentos com histórico vinculado ao cliente.</p></div>
    <Card><CardHeader><CardTitle>Progresso do processo</CardTitle><CardDescription>{completedSteps} de {MEI_STEPS.length} etapas concluídas</CardDescription></CardHeader><CardContent><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Status: {workflow?.status === "concluido" ? "Concluído" : workflow?.status === "em_progresso" ? "Em progresso" : "Não iniciado"}</span><strong className="text-2xl text-primary">{progress}%</strong></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div></CardContent></Card>
    <Card><CardHeader><CardTitle>Etapas do processo</CardTitle><CardDescription>As alterações são salvas no perfil do cliente.</CardDescription></CardHeader><CardContent>{workflowQuery.isLoading ? <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div> : <div className="space-y-3">{MEI_STEPS.map((item) => { const current = steps.find((step) => step.step === item.id); const completed = Boolean(current?.completed); const expanded = expandedStep === item.id; return <div key={item.id} className={`rounded-xl border p-4 ${completed ? "border-emerald-200 bg-emerald-50/60" : "bg-card"}`}><div className="flex items-start gap-3"><button type="button" aria-label={`Marcar etapa ${item.name}`} onClick={() => toggleStep(item.id)} disabled={updateMutation.isPending}>{completed ? <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" /> : <Circle className="mt-0.5 h-6 w-6 text-muted-foreground" />}</button><button type="button" className="flex-1 text-left" onClick={() => setExpandedStep(expanded ? null : item.id)}><p className="font-semibold">{item.id}. {item.name}</p><p className="mt-1 text-sm text-muted-foreground">{item.description}</p></button></div>{expanded && <div className="mt-4 border-t pt-4"><p className="mb-3 text-sm font-medium">Documentos necessários</p><div className="space-y-3">{REQUIRED_DOCUMENTS.map((document) => { const saved = documents.find((item) => item.name === document.name); const uploaded = Boolean(saved?.uploaded); return <div key={document.name} className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={uploaded} onChange={() => toggleDocument(document.name)} disabled={updateMutation.isPending} /><span>{document.name}{document.required && <span className="ml-1 text-rose-600">*</span>}</span></label><div className="flex items-center gap-2"><input className="hidden" type="file" accept=".pdf,.png,.jpg,.jpeg" ref={(node) => { fileRefs.current[document.name] = node; }} onChange={(event) => void uploadDocument(document.name, event.target.files?.[0])} /><Button type="button" size="sm" variant="outline" onClick={() => fileRefs.current[document.name]?.click()} disabled={uploadingDocument === document.name}>{uploadingDocument === document.name ? <Spinner className="mr-2 h-4 w-4" /> : <FileUp className="mr-2 h-4 w-4" />} {uploaded ? "Substituir arquivo" : "Anexar arquivo"}</Button>{saved?.fileKey && <span className="text-xs text-emerald-700">Armazenado</span>}</div></div>; })}</div></div>}</div>; })}</div>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Arquivos vinculados</CardTitle><CardDescription>Documentos armazenados com segurança para este cliente.</CardDescription></CardHeader><CardContent>{filesQuery.isLoading ? <Spinner className="h-5 w-5" /> : filesQuery.data?.length ? <ul className="space-y-2">{filesQuery.data.map((file) => <li key={file.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>{file.fileName}</span><span className="text-muted-foreground">{file.fileType.toUpperCase()}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Nenhum documento enviado.</p>}</CardContent></Card>
  </div></AionDashboardLayout>;
}
