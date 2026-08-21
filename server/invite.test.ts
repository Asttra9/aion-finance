import { describe, expect, it } from "vitest";
import { hashAccountInviteToken } from "./db";

describe("hashAccountInviteToken", () => {
  it("gera hash SHA-256 determinístico sem preservar o token em texto puro", () => {
    const token = "GHTZ-bvGEt1jtkhZmZS6AsKGSNvPrseNZ4hJp6x5RQ";
    const hash = hashAccountInviteToken(token);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(hash).toBe(hashAccountInviteToken(token));
    expect(hash).not.toBe(hashAccountInviteToken(`${token}x`));
  });
});
