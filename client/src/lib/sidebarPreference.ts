export const AION_SIDEBAR_PREFERENCE_KEY = "aion-sidebar-expanded";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function resolveStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) return storage;
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

export function readSidebarPreference(storage?: StorageLike): boolean {
  try {
    const storedValue = resolveStorage(storage)?.getItem(AION_SIDEBAR_PREFERENCE_KEY);
    return storedValue !== "false";
  } catch {
    return true;
  }
}

export function writeSidebarPreference(open: boolean, storage?: StorageLike) {
  try {
    resolveStorage(storage)?.setItem(AION_SIDEBAR_PREFERENCE_KEY, String(open));
  } catch {
    // A navegação permanece funcional quando o armazenamento local está indisponível.
  }
}
