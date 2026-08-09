/**
 * OFX Parser - Parses Open Financial Exchange format files
 * Extracts transactions from OFX bank statements
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

/**
 * Parse OFX file content and extract transactions
 * Supports OFX 1.x format (plain text)
 */
export function parseOFX(content: string): OFXParseResult {
  const result: OFXParseResult = {
    transactions: [],
    errors: [],
  };

  try {
    // Extract STMTRS (Statement Response) section
    const stmtMatch = content.match(/<STMTRS>[\s\S]*?<\/STMTRS>/);
    if (!stmtMatch) {
      result.errors.push("Nenhuma seção STMTRS encontrada no arquivo OFX");
      return result;
    }

    const stmtContent = stmtMatch[0];

    // Extract account info
    const bankIdMatch = stmtContent.match(/<BANKID>([^<]+)<\/BANKID>/);
    const accountMatch = stmtContent.match(/<ACCTID>([^<]+)<\/ACCTID>/);

    if (bankIdMatch) result.bankCode = bankIdMatch[1];
    if (accountMatch) result.accountNumber = accountMatch[1];

    // Extract transaction list
    const tranlistMatch = stmtContent.match(
      /<BANKTRANLIST>[\s\S]*?<\/BANKTRANLIST>/
    );
    if (!tranlistMatch) {
      result.errors.push("Nenhuma lista de transações encontrada");
      return result;
    }

    const tranlistContent = tranlistMatch[0];

    // Extract individual transactions
    const tranMatches = tranlistContent.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g);
    if (!tranMatches) {
      result.errors.push("Nenhuma transação encontrada");
      return result;
    }

    for (const tranMatch of tranMatches) {
      try {
        const transaction = parseTransaction(tranMatch);
        if (transaction) {
          result.transactions.push(transaction);
        }
      } catch (error) {
        result.errors.push(
          `Erro ao processar transação: ${error instanceof Error ? error.message : "desconhecido"}`
        );
      }
    }
  } catch (error) {
    result.errors.push(
      `Erro ao processar arquivo OFX: ${error instanceof Error ? error.message : "desconhecido"}`
    );
  }

  return result;
}

/**
 * Parse individual transaction from OFX STMTTRN element
 */
function parseTransaction(tranContent: string): OFXTransaction | null {
  // Extract date (DTPOSTED or TRNDATE)
  let dateMatch = tranContent.match(/<DTPOSTED>(\d{8})/);
  if (!dateMatch) {
    dateMatch = tranContent.match(/<TRNDATE>(\d{8})/);
  }

  if (!dateMatch) {
    throw new Error("Data da transação não encontrada");
  }

  const dateStr = dateMatch[1];
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-indexed
  const day = parseInt(dateStr.substring(6, 8));
  const date = new Date(year, month, day);

  // Extract amount
  const amountMatch = tranContent.match(/<TRNAMT>([^<]+)<\/TRNAMT>/);
  if (!amountMatch) {
    throw new Error("Valor da transação não encontrado");
  }

  const amount = parseFloat(amountMatch[1]);
  const type: "receita" | "despesa" = amount >= 0 ? "receita" : "despesa";

  // Extract description (NAME or MEMO)
  let description = "";
  const nameMatch = tranContent.match(/<NAME>([^<]+)<\/NAME>/);
  const memoMatch = tranContent.match(/<MEMO>([^<]+)<\/MEMO>/);

  if (nameMatch) {
    description = nameMatch[1].trim();
  }
  if (memoMatch) {
    const memo = memoMatch[1].trim();
    description = description ? `${description} - ${memo}` : memo;
  }

  if (!description) {
    description = "Transação sem descrição";
  }

  // Extract transaction ID
  const idMatch = tranContent.match(/<FITID>([^<]+)<\/FITID>/);
  const ofxId = idMatch ? idMatch[1] : `TRN-${Date.now()}-${Math.random()}`;

  return {
    date,
    description,
    amount: Math.abs(amount),
    type,
    ofxId,
  };
}

/**
 * Validate OFX file format
 */
export function isValidOFX(content: string): boolean {
  return (
    content.includes("<OFX>") &&
    content.includes("</OFX>") &&
    content.includes("<STMTRS>")
  );
}

/**
 * Extract bank and account info from OFX
 */
export function extractOFXMetadata(content: string): {
  bankCode?: string;
  accountNumber?: string;
  accountType?: string;
} {
  const metadata: {
    bankCode?: string;
    accountNumber?: string;
    accountType?: string;
  } = {};

  const bankIdMatch = content.match(/<BANKID>([^<]+)<\/BANKID>/);
  const accountMatch = content.match(/<ACCTID>([^<]+)<\/ACCTID>/);
  const acctTypeMatch = content.match(/<ACCTTYPE>([^<]+)<\/ACCTTYPE>/);

  if (bankIdMatch) metadata.bankCode = bankIdMatch[1];
  if (accountMatch) metadata.accountNumber = accountMatch[1];
  if (acctTypeMatch) metadata.accountType = acctTypeMatch[1];

  return metadata;
}
