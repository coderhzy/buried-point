// packages/sdk-web/src/storage.ts

const STORAGE_PREFIX = 'bp_';

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

class LocalStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return localStorage.getItem(STORAGE_PREFIX + key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, value);
    } catch {
      // Storage full or disabled
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      // Storage disabled
    }
  }
}

class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  get(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  remove(key: string): void {
    this.store.delete(key);
  }
}

export function createStorage(): StorageAdapter {
  try {
    const testKey = '__bp_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return new LocalStorageAdapter();
  } catch {
    return new MemoryStorageAdapter();
  }
}

export const storage = createStorage();
