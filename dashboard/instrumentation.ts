type StorageLike = {
  getItem?: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
  clear?: () => void;
  key?: (index: number) => string | null;
  length?: number;
};

function createStorageShim(): StorageLike {
  const backingStore = new Map<string, string>();

  const storage: StorageLike = {
    getItem: (key: string): string | null => {
      const value = backingStore.get(key);
      return value ?? null;
    },
    setItem: (key: string, value: string): void => {
      backingStore.set(String(key), String(value));
    },
    removeItem: (key: string): void => {
      backingStore.delete(String(key));
    },
    clear: (): void => {
      backingStore.clear();
    },
    key: (index: number): string | null => {
      const keys = Array.from(backingStore.keys());
      return keys[index] ?? null;
    },
  };

  Object.defineProperty(storage, "length", { get: () => backingStore.size });

  return storage;
}

function ensureWebStorage(name: "localStorage" | "sessionStorage"): void {
  const existing = (globalThis as { [key: string]: unknown })[name] as StorageLike | undefined;
  if (existing && typeof existing.getItem === "function") {
    return;
  }

  Object.defineProperty(globalThis, name, {
    configurable: true,
    enumerable: true,
    value: createStorageShim(),
  });
}

export async function register(): Promise<void> {
  ensureWebStorage("localStorage");
  ensureWebStorage("sessionStorage");
}
