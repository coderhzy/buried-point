// packages/core/src/__tests__/schema.test.ts

import { describe, it, expect } from 'vitest';
import {
  validateEvent,
  validateEventWithErrors,
  SchemaValidator,
} from '../schema';
import { generateEventId, generateDeviceId, generateSessionId } from '../utils';
import type { TrackEvent, SchemaConfig } from '../types';

describe('validateEvent', () => {
  it('should validate a correct event', () => {
    const event: TrackEvent = {
      eventId: generateEventId(),
      eventName: 'button_click',
      eventType: 'click',
      timestamp: Date.now(),
      deviceId: generateDeviceId(),
      sessionId: generateSessionId(),
      platform: 'web',
      appId: 'test-app',
      appVersion: '1.0.0',
      sdkVersion: '0.1.0',
      properties: { buttonId: 'submit' },
    };

    expect(validateEvent(event)).toBe(true);
  });

  it('should reject invalid event', () => {
    const event = {
      eventName: 'test',
      // missing required fields
    };

    expect(validateEvent(event)).toBe(false);
  });

  it('should return errors for invalid event', () => {
    const event = {
      eventName: 'test',
      eventType: 'invalid_type',
    };

    const result = validateEventWithErrors(event);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });
});

describe('SchemaValidator', () => {
  const schemaConfig: SchemaConfig = {
    version: '1.0',
    events: [
      {
        name: 'button_click',
        description: 'Button click event',
        type: 'click',
        properties: [
          { name: 'button_id', type: 'string', required: true },
          { name: 'button_text', type: 'string', required: false },
        ],
      },
    ],
  };

  it('should validate properties against schema', () => {
    const validator = new SchemaValidator(schemaConfig);
    const result = validator.validate('button_click', {
      button_id: 'submit',
      button_text: 'Submit',
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should warn for missing required property', () => {
    const validator = new SchemaValidator(schemaConfig);
    const result = validator.validate('button_click', {
      button_text: 'Submit',
    });

    expect(result.valid).toBe(false);
    expect(result.warnings).toContain(
      'Required property "button_id" is missing for event "button_click"'
    );
  });

  it('should warn for undefined event', () => {
    const validator = new SchemaValidator(schemaConfig);
    const result = validator.validate('unknown_event', {});

    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      'Event "unknown_event" is not defined in schema'
    );
  });

  it('should warn for wrong property type', () => {
    const validator = new SchemaValidator(schemaConfig);
    const result = validator.validate('button_click', {
      button_id: 123, // should be string
    });

    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.includes('should be string'))).toBe(
      true
    );
  });
});
