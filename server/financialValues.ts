/** Conversões monetárias seguras para persistência em colunas DECIMAL. */
export function parseMoney(value: string | number) {
  const raw = String(value).trim();
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Informe um valor financeiro válido.");
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function isValidMoney(value: string | number) {
  try {
    parseMoney(value);
    return true;
  } catch {
    return false;
  }
}

export function toDecimal(value: string | number) {
  return parseMoney(value).toFixed(2);
}
