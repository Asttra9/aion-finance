import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getClientsByConsultor: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";

function createConsultorContext(): TrpcContext {
  return {
    user: {
      id: 11,
      openId: "consultor-user",
      name: "Consultor Aion",
      email: "consultor@example.com",
      loginMethod: "manus",
      role: "consultor_aion",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("acesso autenticado do Consultor Aion à carteira", () => {
  it("autoriza a listagem de clientes para o perfil consultor_aion", async () => {
    const portfolio = [{ id: 3, consultorId: 11, name: "Cliente de teste" }];
    dbMocks.getClientsByConsultor.mockResolvedValue(portfolio);

    const caller = appRouter.createCaller(createConsultorContext());
    await expect(caller.clients.list()).resolves.toEqual(portfolio);
    expect(dbMocks.getClientsByConsultor).toHaveBeenCalledWith(11);
  });
});
