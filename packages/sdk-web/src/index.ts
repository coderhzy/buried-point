// packages/sdk-web/src/index.ts

export { BuriedPoint } from './tracker';
export { Transport } from './transport';
export { storage, createStorage, type StorageAdapter } from './storage';
export { AutoTracker } from './auto-track';

// Re-export types from core
export type {
  TrackEvent,
  TrackerConfig,
  UserInfo,
  EventType,
  Platform,
  SchemaConfig,
  EventSchema,
  PropertySchema,
} from 'buried-point-core';
