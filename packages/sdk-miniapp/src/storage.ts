// packages/sdk-miniapp/src/storage.ts

import type { MiniAppPlatform } from './types';

const STORAGE_PREFIX = 'bp_';

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/**
 * Storage adapter for WeChat Mini Program
 */
class WeChatStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return wx.getStorageSync(STORAGE_PREFIX + key) || null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      wx.setStorageSync(STORAGE_PREFIX + key, value);
    } catch {
      // Storage full or disabled
    }
  }

  remove(key: string): void {
    try {
      wx.removeStorageSync(STORAGE_PREFIX + key);
    } catch {
      // Storage disabled
    }
  }
}

/**
 * Storage adapter for Alipay Mini Program
 */
class AlipayStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      const result = my.getStorageSync({ key: STORAGE_PREFIX + key });
      return result?.data || null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      my.setStorageSync({ key: STORAGE_PREFIX + key, data: value });
    } catch {
      // Storage full or disabled
    }
  }

  remove(key: string): void {
    try {
      my.removeStorageSync({ key: STORAGE_PREFIX + key });
    } catch {
      // Storage disabled
    }
  }
}

/**
 * Storage adapter for Douyin Mini Program
 */
class DouyinStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return tt.getStorageSync(STORAGE_PREFIX + key) || null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      tt.setStorageSync(STORAGE_PREFIX + key, value);
    } catch {
      // Storage full or disabled
    }
  }

  remove(key: string): void {
    try {
      tt.removeStorageSync(STORAGE_PREFIX + key);
    } catch {
      // Storage disabled
    }
  }
}

/**
 * Memory storage fallback
 */
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

/**
 * Create a storage adapter based on the detected platform
 */
export function createStorage(platform: MiniAppPlatform): StorageAdapter {
  switch (platform) {
    case 'wechat':
      return new WeChatStorageAdapter();
    case 'alipay':
      return new AlipayStorageAdapter();
    case 'douyin':
      return new DouyinStorageAdapter();
    default:
      return new MemoryStorageAdapter();
  }
}

export { MemoryStorageAdapter };
