// packages/sdk-miniapp/src/tracker.ts

import {
  type TrackEvent,
  type UserInfo,
  type EventType,
  type SchemaConfig,
  SchemaValidator,
  generateEventId,
  generateDeviceId,
  generateSessionId,
  SDK_VERSION,
} from 'buried-point-core';
import { Transport } from './transport';
import { createStorage, type StorageAdapter } from './storage';
import type { MiniAppPlatform, MiniAppTrackerConfig, MiniAppPageInfo } from './types';

const DEVICE_ID_KEY = 'device_id';
const SESSION_ID_KEY = 'session_id';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Detect the current mini program platform
 */
function detectPlatform(): MiniAppPlatform {
  // Check for WeChat
  try {
    if (typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function') {
      return 'wechat';
    }
  } catch {
    // Not in WeChat environment
  }

  // Check for Alipay
  try {
    if (typeof my !== 'undefined' && typeof my.getSystemInfoSync === 'function') {
      return 'alipay';
    }
  } catch {
    // Not in Alipay environment
  }

  // Check for Douyin
  try {
    if (typeof tt !== 'undefined' && typeof tt.getSystemInfoSync === 'function') {
      return 'douyin';
    }
  } catch {
    // Not in Douyin environment
  }

  return 'unknown';
}

/**
 * Get system info from the current platform
 */
function getSystemInfo(platform: MiniAppPlatform): Record<string, unknown> {
  try {
    switch (platform) {
      case 'wechat': {
        const info = wx.getSystemInfoSync();
        return {
          brand: info.brand,
          model: info.model,
          system: info.system,
          platform: info.platform,
          version: info.version,
          sdkVersion: info.SDKVersion,
        };
      }
      case 'alipay': {
        const info = my.getSystemInfoSync();
        return {
          brand: info.brand,
          model: info.model,
          system: info.system,
          platform: info.platform,
          version: info.version,
          sdkVersion: info.SDKVersion,
        };
      }
      case 'douyin': {
        const info = tt.getSystemInfoSync();
        return {
          brand: info.brand,
          model: info.model,
          system: info.system,
          platform: info.platform,
          version: info.version,
          sdkVersion: info.SDKVersion,
        };
      }
      default:
        return {};
    }
  } catch {
    return {};
  }
}

export class BuriedPointMiniApp {
  private config: Required<Omit<MiniAppTrackerConfig, 'schema'>> & { schema?: SchemaConfig };
  private transport: Transport;
  private storage: StorageAdapter;
  private schemaValidator: SchemaValidator;
  private platform: MiniAppPlatform;

  private deviceId: string;
  private sessionId: string;
  private userId?: string;
  private userProperties: Record<string, unknown> = {};
  private systemInfo: Record<string, unknown> = {};

  private currentPage?: MiniAppPageInfo;
  private flushTimer?: ReturnType<typeof setInterval>;

  constructor(config: MiniAppTrackerConfig & { schema?: SchemaConfig }) {
    this.platform = config.platform ?? detectPlatform();

    this.config = {
      debug: false,
      batchSize: 10,
      flushInterval: 5000,
      platform: this.platform,
      ...config,
    };

    this.storage = createStorage(this.platform);

    this.transport = new Transport({
      serverUrl: this.config.serverUrl,
      platform: this.platform,
    });

    this.schemaValidator = new SchemaValidator(config.schema);

    this.deviceId = this.getOrCreateDeviceId();
    this.sessionId = this.getOrCreateSessionId();
    this.systemInfo = getSystemInfo(this.platform);

    this.startAutoFlush();

    this.log('Tracker initialized', {
      platform: this.platform,
      deviceId: this.deviceId,
      sessionId: this.sessionId,
    });
  }

  private getOrCreateDeviceId(): string {
    let deviceId = this.storage.get(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateDeviceId();
      this.storage.set(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  private getOrCreateSessionId(): string {
    const stored = this.storage.get(SESSION_ID_KEY);
    if (stored) {
      const [sessionId, timestamp] = stored.split(':');
      if (Date.now() - parseInt(timestamp, 10) < SESSION_TIMEOUT) {
        this.refreshSession(sessionId);
        return sessionId;
      }
    }

    const sessionId = generateSessionId();
    this.refreshSession(sessionId);
    return sessionId;
  }

  private refreshSession(sessionId: string): void {
    this.storage.set(SESSION_ID_KEY, `${sessionId}:${Date.now()}`);
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[BuriedPointMiniApp]', ...args);
    }
  }

  private warn(...args: unknown[]): void {
    if (this.config.debug) {
      console.warn('[BuriedPointMiniApp]', ...args);
    }
  }

  /**
   * Get the detected platform
   */
  getPlatform(): MiniAppPlatform {
    return this.platform;
  }

  /**
   * Set user information
   */
  setUser(user: UserInfo): void {
    this.userId = user.userId;
    const { userId, deviceId, ...rest } = user;
    this.userProperties = rest;
    this.log('User set', user);
  }

  /**
   * Set the current page info (call this in page onShow/onLoad)
   */
  setCurrentPage(pageInfo: MiniAppPageInfo): void {
    this.currentPage = pageInfo;
  }

  private createEvent(
    eventName: string,
    eventType: EventType,
    properties: Record<string, unknown> = {}
  ): TrackEvent {
    // Validate against schema
    if (this.config.schema) {
      const { valid, warnings } = this.schemaValidator.validate(
        eventName,
        properties
      );
      if (!valid || warnings.length > 0) {
        warnings.forEach((w) => this.warn(w));
      }
    }

    this.refreshSession(this.sessionId);

    return {
      eventId: generateEventId(),
      eventName,
      eventType,
      timestamp: Date.now(),
      deviceId: this.deviceId,
      sessionId: this.sessionId,
      userId: this.userId,
      platform: 'miniapp',
      appId: this.config.appId,
      appVersion: this.config.appVersion,
      sdkVersion: SDK_VERSION,
      pageUrl: this.currentPage?.path,
      properties: {
        ...this.userProperties,
        ...this.systemInfo,
        miniappPlatform: this.platform,
        pageQuery: this.currentPage?.query,
        scene: this.currentPage?.scene,
        ...properties,
      },
    };
  }

  private trackEvent(
    eventName: string,
    eventType: EventType,
    properties: Record<string, unknown> = {}
  ): void {
    const event = this.createEvent(eventName, eventType, properties);
    this.transport.enqueue(event);
    this.log('Event tracked', event);

    if (this.transport.getQueueLength() >= this.config.batchSize) {
      this.flush();
    }
  }

  // Public API

  /**
   * Track a page view
   */
  pageView(properties: Record<string, unknown> = {}): void {
    this.trackEvent('page_view', 'page_view', {
      path: this.currentPage?.path,
      query: this.currentPage?.query,
      scene: this.currentPage?.scene,
      ...properties,
    });
  }

  /**
   * Track a click event
   */
  click(eventName: string, properties: Record<string, unknown> = {}): void {
    this.trackEvent(eventName, 'click', properties);
  }

  /**
   * Track exposure events
   */
  expose(
    eventName: string,
    items: Record<string, unknown> | Record<string, unknown>[]
  ): void {
    const itemsArray = Array.isArray(items) ? items : [items];
    for (const item of itemsArray) {
      this.trackEvent(eventName, 'expose', item);
    }
  }

  /**
   * Track a custom event
   */
  track(eventName: string, properties: Record<string, unknown> = {}): void {
    this.trackEvent(eventName, 'custom', properties);
  }

  /**
   * Flush all queued events
   */
  async flush(): Promise<void> {
    try {
      await this.transport.flush();
      this.log('Events flushed');
    } catch (error) {
      this.warn('Failed to flush events', error);
    }
  }

  /**
   * Destroy the tracker instance
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}
