// packages/core/src/types.ts

export type EventType =
  | 'page_view'
  | 'click'
  | 'expose'
  | 'duration'
  | 'performance'
  | 'custom';

export type Platform = 'web' | 'miniapp' | 'ios' | 'android' | 'rn' | 'flutter';

export interface TrackEvent {
  eventId: string;
  eventName: string;
  eventType: EventType;
  timestamp: number;
  serverTime?: number;

  userId?: string;
  deviceId: string;
  sessionId: string;

  platform: Platform;
  appId: string;
  appVersion: string;
  sdkVersion: string;

  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;

  properties: Record<string, unknown>;
}

export interface UserInfo {
  userId?: string;
  deviceId: string;
  [key: string]: unknown;
}

export interface PageInfo {
  pageUrl: string;
  pageTitle?: string;
  referrer?: string;
}

export interface PerformanceData {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
}

export interface TrackerConfig {
  serverUrl: string;
  appId: string;
  appVersion: string;
  debug?: boolean;
  batchSize?: number;
  flushInterval?: number;
  schema?: SchemaConfig;
}

export interface SchemaConfig {
  version: string;
  events: EventSchema[];
}

export interface EventSchema {
  name: string;
  description?: string;
  type: EventType;
  module?: string;
  owner?: string;
  properties: PropertySchema[];
}

export interface PropertySchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  description?: string;
}

export interface BatchPayload {
  events: TrackEvent[];
  sentAt: number;
}

export interface ServerResponse {
  success: boolean;
  message?: string;
  eventIds?: string[];
}
