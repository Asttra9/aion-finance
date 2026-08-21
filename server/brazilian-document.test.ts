import { describe, expect, it } from "vitest";
import { formatCpfCnpj, isValidCpfCnpj, normalizeCpfCnpj } from "@shared/brazilianDocument";

describe("documentos brasileiros", () => {
  it("normaliza e formata CPF e CNPJ sem persistir pontuação", () => {
    expect(normalizeCpfCnpj("123.456.789-09")).toBe("12345678909");
    expect(formatCpfCnpj("12345678909")).toBe("123.456.789-09");
    expect(formatCpfCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("aceita documentos válidos e rejeita sequências ou dígitos inválidos", () => {
    expect(isValidCpfCnpj("123.456.789-09")).toBe(true);
    expect(isValidCpfCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCpfCnpj("111.111.111-11")).toBe(false);
    expect(isValidCpfCnpj("11.222.333/0001-82")).toBe(false);
  });
});
