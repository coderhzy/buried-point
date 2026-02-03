// packages/server/src/__tests__/server.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type TrackServer } from '../server';
import { generateEventId, generateDeviceId, generateSessionId } from 'buried-point-core';
import fs from 'fs';
import path from 'path';

describe('TrackServer', () => {
  let server: TrackServer;
  const testDbPath = path.join(__dirname, 'test.db');

  beforeAll(async () => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    server = createServer({
      port: 3001,
      database: testDbPath,
      logger: false,
    });

    await server.app.ready();
  });

  afterAll(async () => {
    await server.stop();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should handle health check', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
  });

  it('should track single event', async () => {
    const event = {
      eventId: generateEventId(),
      eventName: 'test_event',
      eventType: 'custom',
      timestamp: Date.now(),
      deviceId: generateDeviceId(),
      sessionId: generateSessionId(),
      platform: 'web',
      appId: 'test-app',
      appVersion: '1.0.0',
      sdkVersion: '0.1.0',
      properties: { key: 'value' },
    };

    const response = await server.app.inject({
      method: 'POST',
      url: '/track',
      payload: event,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.eventIds).toContain(event.eventId);
  });

  it('should track batch events', async () => {
    const events = [
      {
        eventId: generateEventId(),
        eventName: 'batch_event_1',
        eventType: 'click',
        timestamp: Date.now(),
        deviceId: generateDeviceId(),
        sessionId: generateSessionId(),
        platform: 'web',
        appId: 'test-app',
        appVersion: '1.0.0',
        sdkVersion: '0.1.0',
        properties: {},
      },
      {
        eventId: generateEventId(),
        eventName: 'batch_event_2',
        eventType: 'click',
        timestamp: Date.now(),
        deviceId: generateDeviceId(),
        sessionId: generateSessionId(),
        platform: 'web',
        appId: 'test-app',
        appVersion: '1.0.0',
        sdkVersion: '0.1.0',
        properties: {},
      },
    ];

    const response = await server.app.inject({
      method: 'POST',
      url: '/track/batch',
      payload: { events, sentAt: Date.now() },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.eventIds).toHaveLength(2);
  });

  it('should query events', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/events?limit=10',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.events).toBeDefined();
    expect(Array.isArray(body.events)).toBe(true);
  });

  it('should get overview stats', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/stats/overview',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.today).toBeDefined();
    expect(body.daily).toBeDefined();
  });

  it('should reject invalid event', async () => {
    const response = await server.app.inject({
      method: 'POST',
      url: '/track',
      payload: { invalid: 'event' },
    });

    expect(response.statusCode).toBe(400);
  });
});
