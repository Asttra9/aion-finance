import { describe, expect, it } from "vitest";
import { hashLocalPassword, validateLocalPassword, verifyLocalPassword } from "./localPassword";

describe("credenciais locais", () => {
  it("exige senha longa com letras e números", () => {
    expect(validateLocalPassword("curta1")).toContain("10 caracteres");
    expect(validateLocalPassword("somenteletras")).toContain("letras e números");
    expect(validateLocalPassword("1234567890")).toContain("letras e números");
    expect(validateLocalPassword("SenhaAion2026")).toBeNull();
  });

  it("gera hashes scrypt verificáveis sem expor a senha", async () => {
    const password = "SenhaAion2026";
    const hash = await hashLocalPassword(password);

    expect(hash).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]+$/);
    expect(hash).not.toContain(password);
    await expect(verifyLocalPassword(password, hash)).resolves.toBe(true);
    await expect(verifyLocalPassword("SenhaIncorreta2026", hash)).resolves.toBe(false);
    await expect(verifyLocalPassword(password, "hash-inválido")).resolves.toBe(false);
  });
});
