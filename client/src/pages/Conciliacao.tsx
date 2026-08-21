import { useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, FileUp, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import AionDashboardLayout from "@/components/AionDashboardLayout";
import { toast } from "sonner";

export default function Conciliacao() {
  const [location] = useLocation();
  const clientId = Number(location.split("/")[2]) || undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [financeType, setFinanceType] = useState<"pessoal" | "empresarial">("empresarial");
  const [importSource, setImportSource] = useState<"ofx" | "mercado_pago">("ofx");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const transactionsQuery = trpc.transactions.list.useQuery({ clientId: clientId || 0 }, { enabled: !!clientId });
  const categoriesQuery = trpc.transactions.categories.useQuery(undefined, { enabled: !!clientId });
  const utils = trpc.useUtils();
  const importMutation = trpc.transactions.importOfx.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      setSelectedFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      void utils.transactions.list.invalidate({ clientId });
      toast.success(`${result.imported} transação(ões) importada(s); ${result.skipped} duplicata(s) ignorada(s).`);
    },
    onError: (error) => toast.error(error.message),
  });
  const mercadoPagoMutation = trpc.transactions.importMercadoPago.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      setSelectedFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      void utils.transactions.list.invalidate({ clientId });
      toast.success(`${result.imported} transação(ões) importada(s); ${result.skipped} duplicata(s) ignorada(s).${result.cancelled ? ` ${result.cancelled} devolução(ões) cancelaram lançamentos relacionados.` : ""}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const reconcileMutation = trpc.transactions.reconcile.useMutation({
    onSuccess: () => {
      void utils.transactions.list.invalidate({ clientId });
      toast.success("Transação conciliada.");
    },
    onError: (error) => toast.error(error.message),
  });

  const transactions = transactionsQuery.data ?? [];
  const pending = useMemo(() => transactions.filter((transaction) => transaction.status === "pendente"), [transactions]);
  const reconciled = useMemo(() => transactions.filter((transaction) => transaction.status === "conciliado"), [transactions]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !clientId) return;
    setSelectedFileName(file.name);
    const content = importSource === "mercado_pago"
      ? new TextDecoder("iso-8859-1").decode(await file.arrayBuffer())
      : await file.text();
    const payload = { clientId, fileName: file.name, content, financeType, categoryId: categoryId === "none" ? undefined : Number(categoryId) };
    if (importSource === "mercado_pago") mercadoPagoMutation.mutate(payload);
    else importMutation.mutate(payload);
  };

  if (!clientId) {
    return <AionDashboardLayout><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Selecione um cliente para acessar a conciliação bancária.</AlertDescription></Alert></AionDashboardLayout>;
  }

  return (
    <AionDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">AION · Conciliação</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Conciliação bancária</h1>
            <p className="mt-1 text-muted-foreground">Importe o extrato, classifique o contexto financeiro e confirme os lançamentos.</p>
          </div>
          <Button variant="outline" onClick={() => void transactionsQuery.refetch()} disabled={transactionsQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${transactionsQuery.isFetching ? "animate-spin" : ""}`} />Atualizar</Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5 text-primary" />Importar extrato</CardTitle><CardDescription>{importSource === "ofx" ? "O arquivo será vinculado ao cliente e as transações serão deduplicadas pelo FITID." : "CSV do Mercado Pago: vendas e tarifas são importadas; devoluções cancelam o lançamento relacionado."}</CardDescription></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_190px_200px_220px_auto] md:items-end">
            <div className="space-y-2"><Label htmlFor="ofx-file">{importSource === "ofx" ? "Arquivo OFX" : "CSV do Mercado Pago"}</Label><Input id="ofx-file" ref={fileInputRef} type="file" accept={importSource === "ofx" ? ".ofx,.txt" : ".csv"} onChange={handleFileUpload} disabled={importMutation.isPending || mercadoPagoMutation.isPending} /><p className="text-xs text-muted-foreground">{selectedFileName || (importSource === "ofx" ? "Até 5 MB · OFX 1.x e 2.x" : "Até 5 MB · CSV exportado pelo Mercado Pago")}</p></div>
            <div className="space-y-2"><Label>Fonte do extrato</Label><Select value={importSource} onValueChange={(value) => setImportSource(value as "ofx" | "mercado_pago")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ofx">Banco (OFX)</SelectItem><SelectItem value="mercado_pago">Mercado Pago (CSV)</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Contexto financeiro</Label><Select value={financeType} onValueChange={(value: "pessoal" | "empresarial") => setFinanceType(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="empresarial">Empresarial</SelectItem><SelectItem value="pessoal">Pessoal</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Categoria padrão</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger><SelectContent><SelectItem value="none">Sem categoria</SelectItem>{categoriesQuery.data?.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}</SelectContent></Select></div>
            <Button onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending || mercadoPagoMutation.isPending}>{importMutation.isPending || mercadoPagoMutation.isPending ? <><Spinner className="mr-2 h-4 w-4" />Importando</> : <><FileUp className="mr-2 h-4 w-4" />Selecionar arquivo</>}</Button>
          </CardContent>
        </Card>

        {importResult && <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>{importResult.imported} lançamento(s) persistido(s), {importResult.skipped} duplicata(s) ignorada(s).{importResult.errors.length > 0 && ` ${importResult.errors.length} aviso(s) do parser.`}</AlertDescription></Alert>}

        <div className="grid gap-4 md:grid-cols-3"><Card><CardHeader className="pb-2"><CardDescription>Total de lançamentos</CardDescription><CardTitle className="text-2xl">{transactions.length}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Pendentes</CardDescription><CardTitle className="text-2xl text-amber-600">{pending.length}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Conciliados</CardDescription><CardTitle className="text-2xl text-emerald-600">{reconciled.length}</CardTitle></CardHeader></Card></div>

        <Card><CardHeader><CardTitle>Lançamentos pendentes</CardTitle><CardDescription>Revise categoria e contexto antes de confirmar a conciliação.</CardDescription></CardHeader><CardContent>{transactionsQuery.isLoading ? <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div> : pending.length === 0 ? <div className="py-10 text-center text-sm text-muted-foreground">Nenhum lançamento pendente de conciliação.</div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Contexto</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{pending.map((transaction) => <TableRow key={transaction.id}><TableCell>{new Date(transaction.date).toLocaleDateString("pt-BR")}</TableCell><TableCell className="max-w-[280px] truncate">{transaction.description}</TableCell><TableCell>{transaction.type === "receita" ? "Receita" : "Despesa"}</TableCell><TableCell className={transaction.type === "receita" ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>R$ {Number(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell><TableCell>{transaction.financeType === "pessoal" ? "Pessoal" : "Empresarial"}</TableCell><TableCell className="text-right"><Button size="sm" onClick={() => reconcileMutation.mutate({ transactionId: transaction.id, financeType: transaction.financeType })} disabled={reconcileMutation.isPending}>Conciliar</Button></TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>
      </div>
    </AionDashboardLayout>
  );
}
