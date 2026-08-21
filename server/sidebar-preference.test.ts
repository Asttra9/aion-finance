import { describe, expect, it } from "vitest";
import {
  AION_SIDEBAR_PREFERENCE_KEY,
  readSidebarPreference,
  writeSidebarPreference,
} from "../client/src/lib/sidebarPreference";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("preferência da barra lateral Aion", () => {
  it("inicia expandida quando não existe preferência salva", () => {
    expect(readSidebarPreference(createStorage())).toBe(true);
  });

  it("restaura o estado recolhido salvo após uma nova leitura", () => {
    const storage = createStorage();
    writeSidebarPreference(false, storage);

    expect(storage.getItem(AION_SIDEBAR_PREFERENCE_KEY)).toBe("false");
    expect(readSidebarPreference(storage)).toBe(false);
  });
});
