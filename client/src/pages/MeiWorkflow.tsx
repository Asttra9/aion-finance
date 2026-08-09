import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import AionDashboardLayout from "@/components/AionDashboardLayout";
import { toast } from "sonner";

const MEI_STEPS = [
  { id: 1, name: "Preparação de Documentos", description: "Reúna RG, CPF e comprovante de endereço" },
  { id: 2, name: "Acesso ao Portal", description: "Acesse o portal do Governo Federal" },
  { id: 3, name: "Preenchimento do Formulário", description: "Preencha o formulário de registro MEI" },
  { id: 4, name: "Confirmação de Dados", description: "Revise e confirme todos os dados" },
  { id: 5, name: "Geração do CNPJ", description: "Aguarde a geração automática do CNPJ" },
  { id: 6, name: "Emissão do Certificado", description: "Baixe o certificado de registro" },
  { id: 7, name: "Abertura de Conta Bancária", description: "Abra uma conta bancária com o CNPJ" },
  { id: 8, name: "Finalização", description: "Registro completo e pronto para operar" },
];

const REQUIRED_DOCUMENTS = [
  { id: 1, name: "RG", required: true },
  { id: 2, name: "CPF", required: true },
  { id: 3, name: "Comprovante de Endereço", required: true },
  { id: 4, name: "Declaração de Imposto de Renda", required: false },
  { id: 5, name: "Contrato Social (se aplicável)", required: false },
];

export default function MeiWorkflow() {
  const [location] = useLocation();
  const clientId = location.includes("/clientes/")
    ? parseInt(location.split("/")[2])
    : undefined;

  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const { data: workflow, isLoading, refetch } = trpc.meiWorkflow.get.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  const updateStatusMutation = trpc.meiWorkflow.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Workflow atualizado com sucesso!");
    },
  });

  if (!clientId) {
    return (
      <AionDashboardLayout>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Cliente não selecionado</p>
        </div>
      </AionDashboardLayout>
    );
  }

  const handleStepToggle = (stepId: number) => {
    if (!workflow) return;

    const steps = workflow.steps || [];
    const updatedSteps = steps.map((s: any) =>
      s.step === stepId.toString()
        ? { ...s, completed: !s.completed, completedAt: !s.completed ? new Date().toISOString() : undefined }
        : s
    );

    updateStatusMutation.mutate({
      clientId,
      status: workflow.status,
      steps: updatedSteps,
    });
  };

  const completedSteps = (workflow?.steps || []).filter((s: any) => s.completed).length;
  const progressPercentage = Math.round((completedSteps / MEI_STEPS.length) * 100);

  return (
    <AionDashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Workflow de Abertura de MEI</h2>
          <p className="text-muted-foreground mt-1">
            Acompanhe o processo de registro como Microempreendedor Individual
          </p>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {completedSteps} de {MEI_STEPS.length} etapas concluídas
                </span>
                <span className="text-2xl font-bold text-blue-600">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {MEI_STEPS.map((step) => {
                  const isCompleted = workflow?.steps?.some(
                    (s: any) => s.step === step.id.toString() && s.completed
                  );
                  return (
                    <div
                      key={step.id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isCompleted
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {isCompleted ? "✓" : step.id}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Etapas do Processo</CardTitle>
            <CardDescription>
              Clique em cada etapa para marcar como concluída
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : (
              <div className="space-y-3">
                {MEI_STEPS.map((step) => {
                  const isCompleted = workflow?.steps?.some(
                    (s: any) => s.step === step.id.toString() && s.completed
                  );

                  return (
                    <div
                      key={step.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        isCompleted
                          ? "bg-green-50 border-green-200"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStepToggle(step.id);
                          }}
                          disabled={updateStatusMutation.isPending}
                          className="mt-1"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          ) : (
                            <Circle className="w-6 h-6 text-gray-400" />
                          )}
                        </button>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {step.id}. {step.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      {expandedStep === step.id && (
                        <div className="mt-4 pl-10 pt-4 border-t border-gray-200">
                          <p className="text-sm text-muted-foreground mb-3">
                            Documentos necessários para esta etapa:
                          </p>
                          <ul className="space-y-2">
                            {REQUIRED_DOCUMENTS.map((doc) => (
                              <li key={doc.id} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" className="w-4 h-4" />
                                <span>
                                  {doc.name}
                                  {doc.required && <span className="text-red-600 ml-1">*</span>}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Badge */}
        <Card>
          <CardHeader>
            <CardTitle>Status Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full ${
                  workflow?.status === "concluido"
                    ? "bg-green-600"
                    : workflow?.status === "em_progresso"
                    ? "bg-blue-600"
                    : "bg-gray-400"
                }`}
              />
              <span className="font-medium">
                {workflow?.status === "concluido"
                  ? "Processo Concluído"
                  : workflow?.status === "em_progresso"
                  ? "Em Progresso"
                  : "Não Iniciado"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AionDashboardLayout>
  );
}
