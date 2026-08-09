import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import AionDashboardLayout from "@/components/AionDashboardLayout";
import { toast } from "sonner";

export default function Conciliacao() {
  const [location] = useLocation();
  const clientId = location.includes("/clientes/")
    ? parseInt(location.split("/")[2])
    : undefined;

  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedTransactions, setImportedTransactions] = useState<any[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: transactions, isLoading, refetch } = trpc.transactions.list.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  const createTransactionMutation = trpc.transactions.create.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Transações importadas com sucesso!");
      setImportedTransactions([]);
      setSelectedTransactions([]);
      setOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao importar: ${error.message}`);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const content = await file.text();

      // Parse OFX locally (simplified version)
      const transactions = parseOFXSimple(content);

      if (transactions.length === 0) {
        toast.error("Nenhuma transação encontrada no arquivo OFX");
        return;
      }

      setImportedTransactions(transactions);
      setSelectedTransactions(transactions.map((_, i) => i));
      toast.success(`${transactions.length} transação(ões) encontrada(s)`);
    } catch (error) {
      toast.error(
        `Erro ao ler arquivo: ${error instanceof Error ? error.message : "desconhecido"}`
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const parseOFXSimple = (content: string) => {
    const transactions: any[] = [];

    // Extract STMTTRN blocks
    const tranMatches = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) || [];

    for (const tranMatch of tranMatches) {
      try {
        // Extract date
        let dateMatch = tranMatch.match(/<DTPOSTED>(\d{8})/);
        if (!dateMatch) {
          dateMatch = tranMatch.match(/<TRNDATE>(\d{8})/);
        }

        if (!dateMatch) continue;

        const dateStr = dateMatch[1];
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        const date = new Date(year, month, day);

        // Extract amount
        const amountMatch = tranMatch.match(/<TRNAMT>([^<]+)<\/TRNAMT>/);
        if (!amountMatch) continue;

        const amount = parseFloat(amountMatch[1]);
        const type = amount >= 0 ? "receita" : "despesa";

        // Extract description
        let description = "";
        const nameMatch = tranMatch.match(/<NAME>([^<]+)<\/NAME>/);
        const memoMatch = tranMatch.match(/<MEMO>([^<]+)<\/MEMO>/);

        if (nameMatch) description = nameMatch[1].trim();
        if (memoMatch) {
          const memo = memoMatch[1].trim();
          description = description ? `${description} - ${memo}` : memo;
        }

        if (!description) description = "Transação sem descrição";

        // Extract transaction ID
        const idMatch = tranMatch.match(/<FITID>([^<]+)<\/FITID>/);
        const ofxId = idMatch ? idMatch[1] : `TRN-${Date.now()}`;

        transactions.push({
          date,
          description,
          amount: Math.abs(amount),
          type,
          ofxId,
        });
      } catch (error) {
        console.error("Erro ao processar transação:", error);
      }
    }

    return transactions;
  };

  const handleImportTransactions = async () => {
    if (selectedTransactions.length === 0 || !clientId) return;

    const toImport = importedTransactions.filter((_, i) =>
      selectedTransactions.includes(i)
    );

    for (const transaction of toImport) {
      await createTransactionMutation.mutateAsync({
        clientId,
        description: transaction.description,
        amount: transaction.amount.toString(),
        type: transaction.type,
        date: new Date(transaction.date),
        financeType: "empresarial",
      });
    }
  };

  const reconciled = transactions?.filter((t) => t.status === "conciliado") || [];
  const pending = transactions?.filter((t) => t.status === "pendente") || [];

  return (
    <AionDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Conciliação Bancária</h2>
            <p className="text-muted-foreground mt-1">
              Importe e reconcilie seus extratos bancários
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Importar OFX
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Importar Extrato Bancário (OFX)</DialogTitle>
                <DialogDescription>
                  Selecione um arquivo OFX para importar transações
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ofx-file">Arquivo OFX</Label>
                  <Input
                    id="ofx-file"
                    type="file"
                    accept=".ofx,.txt"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    disabled={importing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formatos suportados: OFX 1.x (.ofx, .txt)
                  </p>
                </div>

                {importedTransactions.length > 0 && (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        {importedTransactions.length} transação(ões) encontrada(s)
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label>Selecione as transações para importar</Label>
                      <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <input
                                  type="checkbox"
                                  checked={
                                    selectedTransactions.length ===
                                    importedTransactions.length
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTransactions(
                                        importedTransactions.map((_, i) => i)
                                      );
                                    } else {
                                      setSelectedTransactions([]);
                                    }
                                  }}
                                />
                              </TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importedTransactions.map((transaction, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedTransactions.includes(
                                      index
                                    )}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedTransactions([
                                          ...selectedTransactions,
                                          index,
                                        ]);
                                      } else {
                                        setSelectedTransactions(
                                          selectedTransactions.filter(
                                            (i) => i !== index
                                          )
                                        );
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  {new Date(
                                    transaction.date
                                  ).toLocaleDateString("pt-BR")}
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {transaction.description}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      transaction.type === "receita"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {transaction.type === "receita"
                                      ? "Receita"
                                      : "Despesa"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  R$ {transaction.amount.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <Button
                      onClick={handleImportTransactions}
                      disabled={
                        selectedTransactions.length === 0 ||
                        createTransactionMutation.isPending
                      }
                      className="w-full"
                    >
                      {createTransactionMutation.isPending ? (
                        <>
                          <Spinner className="w-4 h-4 mr-2" />
                          Importando...
                        </>
                      ) : (
                        `Importar ${selectedTransactions.length} Transação(ões)`
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Transações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transactions?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conciliadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {reconciled.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {pending.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transações para Conciliar</CardTitle>
            <CardDescription>
              Transações pendentes de conciliação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : pending.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.date).toLocaleDateString(
                            "pt-BR"
                          )}
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
                            {transaction.type === "receita"
                              ? "Receita"
                              : "Despesa"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          R$ {parseFloat(transaction.amount as any).toLocaleString(
                            "pt-BR",
                            { minimumFractionDigits: 2 }
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Conciliar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Todas as transações foram conciliadas!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AionDashboardLayout>
  );
}
