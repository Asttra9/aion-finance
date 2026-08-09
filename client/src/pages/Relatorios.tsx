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
import { Download, FileText, Plus } from "lucide-react";
import { useLocation } from "wouter";
import AionDashboardLayout from "@/components/AionDashboardLayout";
import { toast } from "sonner";

export default function Relatorios() {
  const [location] = useLocation();
  const clientId = location.includes("/clientes/") 
    ? parseInt(location.split("/")[2])
    : undefined;

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    reportType: "dre",
  });

  const { data: reports, isLoading, refetch } = trpc.reports.list.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  const generateMutation = trpc.reports.generate.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Relatório gerado com sucesso!");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    },
  });

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;

    generateMutation.mutate({
      clientId,
      month: formData.month,
      year: formData.year,
      reportType: formData.reportType as "dre" | "fluxo_caixa",
    });
  };

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <AionDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Relatórios Financeiros</h2>
            <p className="text-muted-foreground mt-1">
              Gere e baixe seus relatórios profissionais em PDF
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Gerar Relatório
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar Novo Relatório</DialogTitle>
                <DialogDescription>
                  Selecione o período e tipo de relatório desejado
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleGenerateReport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reportType">Tipo de Relatório *</Label>
                  <Select
                    value={formData.reportType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, reportType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dre">
                        DRE (Demonstração de Resultado)
                      </SelectItem>
                      <SelectItem value="fluxo_caixa">
                        Fluxo de Caixa
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="month">Mês *</Label>
                    <Select
                      value={formData.month.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, month: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Ano *</Label>
                    <Select
                      value={formData.year.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, year: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={generateMutation.isPending}
                  className="w-full"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Gerando...
                    </>
                  ) : (
                    "Gerar Relatório"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>Relatórios Disponíveis</CardTitle>
            <CardDescription>
              Histórico de relatórios gerados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : reports && reports.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Data de Geração</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report: any) => {
                      const reportDate = new Date(report.month);

                      return (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="font-medium">
                                {report.reportType === "dre"
                                  ? "DRE"
                                  : "Fluxo de Caixa"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {reportDate.toLocaleDateString("pt-BR", {
                              month: "long",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            {new Date(report.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              Pronto
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Download logic would go here
                                toast.info("Download iniciado...");
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Baixar PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhum relatório gerado ainda
                </p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Gerar Primeiro Relatório
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Templates Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">DRE (Demonstração de Resultado)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Relatório que mostra a lucratividade do negócio, com receitas, despesas e resultado líquido do período.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fluxo de Caixa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Relatório que apresenta as entradas e saídas de dinheiro, mostrando a disponibilidade de caixa ao longo do período.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AionDashboardLayout>
  );
}
