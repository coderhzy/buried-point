// packages/sdk-miniapp/src/types.ts

/**
 * Supported mini program platforms
 */
export type MiniAppPlatform = 'wechat' | 'alipay' | 'douyin' | 'unknown';

/**
 * Mini program specific configuration
 */
export interface MiniAppTrackerConfig {
  serverUrl: string;
  appId: string;
  appVersion: string;
  debug?: boolean;
  batchSize?: number;
  flushInterval?: number;
  /** Force a specific platform instead of auto-detection */
  platform?: MiniAppPlatform;
}

/**
 * Page information for mini programs
 */
export interface MiniAppPageInfo {
  path: string;
  query?: Record<string, string>;
  scene?: number;
}

// Global type declarations for mini program APIs
declare global {
  // Timer functions (available in mini program environments)
  function setInterval(callback: () => void, ms: number): number;
  function clearInterval(id: number | undefined): void;
  function setTimeout(callback: () => void, ms: number): number;
  function clearTimeout(id: number | undefined): void;

  // Console (available in mini program environments)
  const console: {
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    info(...args: unknown[]): void;
  };

  // WeChat Mini Program
  const wx: {
    getStorageSync(key: string): string | undefined;
    setStorageSync(key: string, value: string): void;
    removeStorageSync(key: string): void;
    request(options: {
      url: string;
      method?: string;
      data?: unknown;
      header?: Record<string, string>;
      timeout?: number;
      success?: (res: { statusCode: number; data: unknown }) => void;
      fail?: (err: { errMsg: string }) => void;
      complete?: () => void;
    }): void;
    getSystemInfoSync(): {
      brand: string;
      model: string;
      system: string;
      platform: string;
      version: string;
      SDKVersion: string;
    };
  };

  // Alipay Mini Program
  const my: {
    getStorageSync(options: { key: string }): { data?: string };
    setStorageSync(options: { key: string; data: string }): void;
    removeStorageSync(options: { key: string }): void;
    request(options: {
      url: string;
      method?: string;
      data?: unknown;
      headers?: Record<string, string>;
      timeout?: number;
      success?: (res: { status: number; data: unknown }) => void;
      fail?: (err: { error: string }) => void;
      complete?: () => void;
    }): void;
    getSystemInfoSync(): {
      brand: string;
      model: string;
      system: string;
      platform: string;
      version: string;
      SDKVersion: string;
    };
  };

  // Douyin Mini Program
  const tt: {
    getStorageSync(key: string): string | undefined;
    setStorageSync(key: string, value: string): void;
    removeStorageSync(key: string): void;
    request(options: {
      url: string;
      method?: string;
      data?: unknown;
      header?: Record<string, string>;
      timeout?: number;
      success?: (res: { statusCode: number; data: unknown }) => void;
      fail?: (err: { errMsg: string }) => void;
      complete?: () => void;
    }): void;
    getSystemInfoSync(): {
      brand: string;
      model: string;
      system: string;
      platform: string;
      version: string;
      SDKVersion: string;
    };
  };
}
