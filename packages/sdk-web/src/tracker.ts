// packages/sdk-web/src/tracker.ts

import {
  type TrackEvent,
  type TrackerConfig,
  type UserInfo,
  type EventType,
  type SchemaConfig,
  type PerformanceData,
  SchemaValidator,
  generateEventId,
  generateDeviceId,
  generateSessionId,
  SDK_VERSION,
} from 'buried-point-core';
import { Transport } from './transport';
import { storage } from './storage';
import { AutoTracker } from './auto-track';

const DEVICE_ID_KEY = 'device_id';
const SESSION_ID_KEY = 'session_id';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export class BuriedPoint {
  private config: Required<Omit<TrackerConfig, 'schema'>> & { schema?: SchemaConfig };
  private transport: Transport;
  private schemaValidator: SchemaValidator;
  private autoTracker: AutoTracker;

  private deviceId: string;
  private sessionId: string;
  private userId?: string;
  private userProperties: Record<string, unknown> = {};

  private flushTimer?: ReturnType<typeof setInterval>;

  constructor(config: TrackerConfig) {
    this.config = {
      debug: false,
      batchSize: 10,
      flushInterval: 5000,
      ...config,
    };

    this.transport = new Transport({
      serverUrl: this.config.serverUrl,
    });

    this.schemaValidator = new SchemaValidator(this.config.schema);

    this.deviceId = this.getOrCreateDeviceId();
    this.sessionId = this.getOrCreateSessionId();

    this.autoTracker = new AutoTracker({
      onPageView: (data) => this.trackPageView(data),
      onDuration: (data) => this.trackDuration(data.url, data.duration),
      onPerformance: (data) => this.trackPerformance(data),
    });

    this.startAutoFlush();
    this.autoTracker.start();

    this.log('Tracker initialized', { deviceId: this.deviceId, sessionId: this.sessionId });
  }

  private getOrCreateDeviceId(): string {
    let deviceId = storage.get(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateDeviceId();
      storage.set(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  private getOrCreateSessionId(): string {
    const stored = storage.get(SESSION_ID_KEY);
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
    storage.set(SESSION_ID_KEY, `${sessionId}:${Date.now()}`);
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[BuriedPoint]', ...args);
    }
  }

  private warn(...args: unknown[]): void {
    if (this.config.debug) {
      console.warn('[BuriedPoint]', ...args);
    }
  }

  setUser(user: UserInfo): void {
    this.userId = user.userId;
    const { userId, deviceId, ...rest } = user;
    this.userProperties = rest;
    this.log('User set', user);
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
      platform: 'web',
      appId: this.config.appId,
      appVersion: this.config.appVersion,
      sdkVersion: SDK_VERSION,
      pageUrl: window.location.href,
      pageTitle: document.title,
      referrer: document.referrer,
      properties: {
        ...this.userProperties,
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

  pageView(properties: Record<string, unknown> = {}): void {
    this.trackEvent('page_view', 'page_view', properties);
  }

  private trackPageView(data: {
    url: string;
    title: string;
    referrer: string;
  }): void {
    this.trackEvent('page_view', 'page_view', data);
  }

  click(eventName: string, properties: Record<string, unknown> = {}): void {
    this.trackEvent(eventName, 'click', properties);
  }

  expose(
    eventName: string,
    items: Record<string, unknown> | Record<string, unknown>[]
  ): void {
    const itemsArray = Array.isArray(items) ? items : [items];
    for (const item of itemsArray) {
      this.trackEvent(eventName, 'expose', item);
    }
  }

  track(eventName: string, properties: Record<string, unknown> = {}): void {
    this.trackEvent(eventName, 'custom', properties);
  }

  private trackDuration(url: string, duration: number): void {
    this.trackEvent('page_duration', 'duration', { url, duration });
  }

  private trackPerformance(data: PerformanceData): void {
    this.trackEvent('performance', 'performance', data as Record<string, unknown>);
  }

  async flush(): Promise<void> {
    try {
      await this.transport.flush();
      this.log('Events flushed');
    } catch (error) {
      this.warn('Failed to flush events', error);
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.autoTracker.stop();
    this.flush();
  }
}
