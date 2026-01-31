// packages/sdk-miniapp/src/index.ts

export { BuriedPointMiniApp } from './tracker';
export { Transport } from './transport';
export { createStorage, MemoryStorageAdapter, type StorageAdapter } from './storage';
export type { MiniAppPlatform, MiniAppTrackerConfig, MiniAppPageInfo } from './types';

// Re-export types from core
export type {
  TrackEvent,
  UserInfo,
  EventType,
  Platform,
  SchemaConfig,
  EventSchema,
  PropertySchema,
} from '@buried-point/core';
