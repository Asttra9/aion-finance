import { describe, expect, it } from "vitest";
import { journeyFromBusinessType, journeyPath } from "../client/src/lib/journey";

describe("jornadas Aion", () => {
  it("encaminha a jornada pessoal para seu destino dedicado", () => {
    expect(journeyPath("pessoal")).toBe("/pessoal");
  });

  it("mantém MEIs e empresas na jornada empresarial", () => {
    expect(journeyFromBusinessType("mei")).toBe("empresarial");
    expect(journeyPath(journeyFromBusinessType("mei"))).toBe("/negocio");
  });

  it("prioriza o perfil pessoal efetivamente vinculado", () => {
    expect(journeyFromBusinessType("pessoal")).toBe("pessoal");
  });
});
