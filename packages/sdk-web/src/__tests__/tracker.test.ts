// packages/sdk-web/src/__tests__/tracker.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BuriedPoint } from '../tracker';

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  } as Response)
);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock window
Object.defineProperty(global, 'window', {
  value: {
    location: { href: 'http://localhost:3000/test' },
    addEventListener: vi.fn(),
  },
});

Object.defineProperty(global, 'document', {
  value: {
    title: 'Test Page',
    referrer: 'http://localhost:3000/',
    readyState: 'complete',
    visibilityState: 'visible',
    addEventListener: vi.fn(),
  },
});

Object.defineProperty(global, 'history', {
  value: {
    pushState: vi.fn(),
    replaceState: vi.fn(),
  },
});

Object.defineProperty(global, 'performance', {
  value: {
    getEntriesByType: () => [],
  },
});

describe('BuriedPoint', () => {
  let tracker: BuriedPoint;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();

    tracker = new BuriedPoint({
      serverUrl: 'http://localhost:3000/track',
      appId: 'test-app',
      appVersion: '1.0.0',
      debug: false,
      flushInterval: 60000, // Long interval to control flushing manually
    });
  });

  afterEach(() => {
    tracker.destroy();
  });

  it('should create tracker with correct config', () => {
    expect(tracker).toBeDefined();
  });

  it('should track click event', async () => {
    tracker.click('button_click', { button_id: 'submit' });
    await tracker.flush();

    expect(fetch).toHaveBeenCalled();
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.events).toHaveLength(2); // page_view (auto) + click
    expect(body.events[1].eventName).toBe('button_click');
    expect(body.events[1].eventType).toBe('click');
    expect(body.events[1].properties.button_id).toBe('submit');
  });

  it('should track expose events', async () => {
    tracker.expose('product_expose', [
      { product_id: 'p001', position: 0 },
      { product_id: 'p002', position: 1 },
    ]);
    await tracker.flush();

    expect(fetch).toHaveBeenCalled();
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    // page_view (auto) + 2 expose events
    expect(body.events.length).toBeGreaterThanOrEqual(2);
  });

  it('should set user info', async () => {
    tracker.setUser({ userId: 'user_123', deviceId: 'ignored', name: 'Test' });
    tracker.track('custom_event', {});
    await tracker.flush();

    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    const customEvent = body.events.find(
      (e: { eventName: string }) => e.eventName === 'custom_event'
    );

    expect(customEvent.userId).toBe('user_123');
    expect(customEvent.properties.name).toBe('Test');
  });

  it('should validate events against schema', () => {
    const trackerWithSchema = new BuriedPoint({
      serverUrl: 'http://localhost:3000/track',
      appId: 'test-app',
      appVersion: '1.0.0',
      debug: true,
      schema: {
        version: '1.0',
        events: [
          {
            name: 'button_click',
            type: 'click',
            properties: [
              { name: 'button_id', type: 'string', required: true },
            ],
          },
        ],
      },
    });

    const warnSpy = vi.spyOn(console, 'warn');

    // This should trigger a warning for missing required property
    trackerWithSchema.click('button_click', {});

    expect(warnSpy).toHaveBeenCalled();
    trackerWithSchema.destroy();
  });

  it('should track custom event with track method', async () => {
    tracker.track('custom_action', { action: 'test', value: 42 });
    await tracker.flush();

    expect(fetch).toHaveBeenCalled();
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    const customEvent = body.events.find(
      (e: { eventName: string }) => e.eventName === 'custom_action'
    );

    expect(customEvent).toBeDefined();
    expect(customEvent.eventType).toBe('custom');
    expect(customEvent.properties.action).toBe('test');
    expect(customEvent.properties.value).toBe(42);
  });

  it('should persist device id across sessions', () => {
    const deviceId1 = localStorageMock.getItem('bp_device_id');
    expect(deviceId1).toBeDefined();

    // Create new tracker
    const tracker2 = new BuriedPoint({
      serverUrl: 'http://localhost:3000/track',
      appId: 'test-app',
      appVersion: '1.0.0',
    });

    const deviceId2 = localStorageMock.getItem('bp_device_id');
    expect(deviceId2).toBe(deviceId1);

    tracker2.destroy();
  });

  it('should include correct event structure', async () => {
    tracker.click('test_click', { test: true });
    await tracker.flush();

    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    const clickEvent = body.events.find(
      (e: { eventName: string }) => e.eventName === 'test_click'
    );

    expect(clickEvent).toHaveProperty('eventId');
    expect(clickEvent).toHaveProperty('eventName', 'test_click');
    expect(clickEvent).toHaveProperty('eventType', 'click');
    expect(clickEvent).toHaveProperty('timestamp');
    expect(clickEvent).toHaveProperty('deviceId');
    expect(clickEvent).toHaveProperty('sessionId');
    expect(clickEvent).toHaveProperty('platform', 'web');
    expect(clickEvent).toHaveProperty('appId', 'test-app');
    expect(clickEvent).toHaveProperty('appVersion', '1.0.0');
    expect(clickEvent).toHaveProperty('sdkVersion');
    expect(clickEvent).toHaveProperty('pageUrl');
    expect(clickEvent).toHaveProperty('properties');
  });
});
