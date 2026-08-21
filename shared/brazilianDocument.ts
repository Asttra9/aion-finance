export function normalizeCpfCnpj(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCpfCnpj(value: string) {
  const digits = normalizeCpfCnpj(value).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function isRepeated(value: string) {
  return /^(\d)\1+$/.test(value);
}

function digitFor(value: string, initialWeight: number) {
  const sum = value.split("").reduce((total, digit, index) => total + Number(digit) * (initialWeight - index), 0);
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isValidCpfCnpj(value: string) {
  const digits = normalizeCpfCnpj(value);
  if (digits.length === 11) {
    if (isRepeated(digits)) return false;
    const first = digitFor(digits.slice(0, 9), 10);
    const second = digitFor(digits.slice(0, 10), 11);
    return first === Number(digits[9]) && second === Number(digits[10]);
  }
  if (digits.length === 14) {
    if (isRepeated(digits)) return false;
    const calculate = (source: string) => {
      const weights = source.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const sum = source.split("").reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };
    return calculate(digits.slice(0, 12)) === Number(digits[12]) && calculate(digits.slice(0, 13)) === Number(digits[13]);
  }
  return false;
}
