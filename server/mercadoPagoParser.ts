export type MercadoPagoTransaction = {
  date: Date;
  description: string;
  amount: number;
  type: "receita" | "despesa";
  operationId: string;
  relatedOperationId?: string;
  kind: "transaction" | "refund";
};

export type MercadoPagoParseResult = {
  transactions: MercadoPagoTransaction[];
  errors: string[];
};

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      values.push(value.trim());
      value = "";
    } else value += character;
  }
  values.push(value.trim());
  return values;
}

function parseAmount(value: string | undefined) {
  const raw = (value ?? "")
    .replace(/R\$/gi, "")
    .replace(/\s/g, "");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) throw new Error("valor financeiro inválido");
  return Math.abs(amount);
}

function parseDate(value: string | undefined) {
  const source = (value ?? "").trim();
  const iso = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const br = source.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  const date = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : br ? new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1])) : new Date(source);
  if (Number.isNaN(date.getTime())) throw new Error("data inválida");
  return date;
}

function valueAt(row: string[], columns: Map<string, number>, ...names: string[]) {
  for (const name of names) {
    const index = columns.get(name);
    if (index !== undefined) return row[index];
  }
  return undefined;
}

export function parseMercadoPagoCSV(content: string): MercadoPagoParseResult {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const result: MercadoPagoParseResult = { transactions: [], errors: [] };
  if (lines.length < 2) return { ...result, errors: ["O CSV não contém lançamentos."] };
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  const columns = new Map(headers.map((header, index) => [header, index]));
  const hasRequiredColumns = ["tipo", "descricao"].every((column) => columns.has(column))
    && ["data", "datacriacao", "datadecriacao"].some((column) => columns.has(column));
  if (!hasRequiredColumns) return { ...result, errors: ["Cabeçalho CSV do Mercado Pago não reconhecido."] };

  lines.slice(1).forEach((line, index) => {
    try {
      const row = parseCsvLine(line, delimiter);
      const typeLabel = (valueAt(row, columns, "tipo") ?? "").toLowerCase();
      const isSale = typeLabel.includes("venda") || typeLabel.includes("pagamento recebido");
      const isFee = typeLabel.includes("tarifa") || typeLabel.includes("comissao");
      const isRefund = typeLabel.includes("devolu") || typeLabel.includes("estorno");
      if (!isSale && !isFee && !isRefund) return;
      const gross = valueAt(row, columns, "valorbruto");
      const fee = valueAt(row, columns, "taxa", "comissao");
      const net = valueAt(row, columns, "valorliquido", "valor");
      const amount = isFee ? parseAmount(fee ?? net) : parseAmount(net ?? gross);
      const operationId = valueAt(row, columns, "iddaoperacao", "idoperacao", "numerodaoperacao", "numerooperacao") || `linha-${index + 2}`;
      const relatedOperationId = valueAt(row, columns, "iddaoperacaorelacionada", "idoperacaorelacionada", "operacaorelacionada", "referencia");
      result.transactions.push({
        date: parseDate(valueAt(row, columns, "datadecriacao", "datacriacao", "data")),
        description: valueAt(row, columns, "descricao", "detalhe") || `Mercado Pago · ${isSale ? "Venda" : isFee ? "Tarifa" : "Devolução"}`,
        amount,
        type: isSale ? "receita" : "despesa",
        operationId,
        relatedOperationId,
        kind: isRefund ? "refund" : "transaction",
      });
    } catch (error) {
      result.errors.push(`Linha ${index + 2}: ${error instanceof Error ? error.message : "erro de leitura"}`);
    }
  });
  return result;
}
