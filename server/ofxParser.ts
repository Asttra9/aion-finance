/**
 * Parser de extratos OFX.
 * Aceita OFX 2.x (XML) e OFX 1.x (SGML), cujo padrão mantém diversas tags sem
 * fechamento. O parser deliberadamente lê apenas os campos financeiros usados
 * pela Aion e não executa conteúdo do arquivo.
 */
export interface OFXTransaction {
  date: Date;
  description: string;
  amount: number;
  type: "receita" | "despesa";
  ofxId: string;
}

export interface OFXParseResult {
  transactions: OFXTransaction[];
  accountNumber?: string;
  bankCode?: string;
  errors: string[];
}

function tagValue(content: string, tag: string) {
  const match = content.match(new RegExp(`<${tag}\\b[^>]*>\\s*([^<\\r\\n]+)`, "i"));
  return match?.[1]?.trim();
}

function section(content: string, tag: string) {
  const closed = content.match(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, "i"));
  if (closed) return closed[0];
  const start = content.search(new RegExp(`<${tag}\\b[^>]*>`, "i"));
  return start >= 0 ? content.slice(start) : undefined;
}

function parseOfxAmount(rawValue: string) {
  const normalized = rawValue.includes(",")
    ? rawValue.replace(/\./g, "").replace(",", ".")
    : rawValue;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) throw new Error("Valor da transação é inválido");
  return amount;
}

function parseTransaction(content: string): OFXTransaction {
  const dateValue = tagValue(content, "DTPOSTED") ?? tagValue(content, "TRNDATE");
  if (!dateValue || !/^\d{8}/.test(dateValue)) throw new Error("Data da transação não encontrada");
  const year = Number(dateValue.slice(0, 4));
  const month = Number(dateValue.slice(4, 6)) - 1;
  const day = Number(dateValue.slice(6, 8));
  const date = new Date(year, month, day);
  if (Number.isNaN(date.getTime())) throw new Error("Data da transação é inválida");

  const rawAmount = tagValue(content, "TRNAMT");
  if (!rawAmount) throw new Error("Valor da transação não encontrado");
  const signedAmount = parseOfxAmount(rawAmount);

  const name = tagValue(content, "NAME");
  const memo = tagValue(content, "MEMO");
  const description = [name, memo].filter(Boolean).join(" - ") || "Transação sem descrição";
  const fallbackSource = `${date.toISOString().slice(0, 10)}|${signedAmount.toFixed(2)}|${description}`;
  const fallbackHash = Array.from(fallbackSource).reduce(
    (hash, character) => ((hash * 31 + character.charCodeAt(0)) >>> 0),
    2166136261,
  );

  return {
    date,
    description,
    amount: Math.abs(signedAmount),
    type: signedAmount >= 0 ? "receita" : "despesa",
    ofxId: tagValue(content, "FITID") ?? `TRN-${fallbackHash.toString(16)}`,
  };
}

export function parseOFX(content: string): OFXParseResult {
  const result: OFXParseResult = { transactions: [], errors: [] };
  try {
    const normalized = content.replace(/^\uFEFF/, "");
    const statement = section(normalized, "STMTRS");
    if (!statement) {
      result.errors.push("Nenhuma seção STMTRS encontrada no arquivo OFX");
      return result;
    }
    result.bankCode = tagValue(statement, "BANKID");
    result.accountNumber = tagValue(statement, "ACCTID");
    const transactionList = section(statement, "BANKTRANLIST");
    if (!transactionList) {
      result.errors.push("Nenhuma lista de transações encontrada");
      return result;
    }

    const transactionBlocks = Array.from(
      transactionList.matchAll(/<STMTTRN\b[^>]*>([\s\S]*?)(?=<STMTTRN\b|<\/STMTTRN\b|<\/?BANKTRANLIST\b|$)/gi),
    );
    if (!transactionBlocks.length) {
      result.errors.push("Nenhuma transação encontrada");
      return result;
    }
    for (const block of transactionBlocks) {
      try {
        result.transactions.push(parseTransaction(block[1]));
      } catch (error) {
        result.errors.push(`Erro ao processar transação: ${error instanceof Error ? error.message : "desconhecido"}`);
      }
    }
  } catch (error) {
    result.errors.push(`Erro ao processar arquivo OFX: ${error instanceof Error ? error.message : "desconhecido"}`);
  }
  return result;
}

export function isValidOFX(content: string): boolean {
  return /<OFX\b[^>]*>/i.test(content) && /<STMTRS\b[^>]*>/i.test(content) && /<BANKTRANLIST\b[^>]*>/i.test(content);
}

export function extractOFXMetadata(content: string): { bankCode?: string; accountNumber?: string; accountType?: string } {
  return {
    bankCode: tagValue(content, "BANKID"),
    accountNumber: tagValue(content, "ACCTID"),
    accountType: tagValue(content, "ACCTTYPE"),
  };
}
