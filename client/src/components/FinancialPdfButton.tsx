import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { Download } from "lucide-react";
import { toast } from "sonner";

type Props = {
  clientId: number;
  reportType: "resumo_pessoal" | "dre";
  label: string;
};

export default function FinancialPdfButton({ clientId, reportType, label }: Props) {
  const generate = trpc.reports.generate.useMutation({
    onSuccess: (report) => {
      const anchor = document.createElement("a");
      anchor.href = report.fileUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.click();
      toast.success("PDF gerado com os dados do período.");
    },
    onError: (error) => toast.error(error.message),
  });
  const generatePdf = () => {
    const now = new Date();
    generate.mutate({ clientId, reportType, month: now.getMonth() + 1, year: now.getFullYear() });
  };

  return <Button variant="outline" className="min-h-10 border-primary/30 text-primary hover:bg-accent" onClick={generatePdf} disabled={generate.isPending}>
    {generate.isPending ? <Spinner className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
    {generate.isPending ? "Gerando PDF..." : label}
  </Button>;
}
