// packages/core/src/schema.ts

import { z } from 'zod';
import type { EventSchema, SchemaConfig, TrackEvent } from './types';

const eventTypeSchema = z.enum([
  'page_view',
  'click',
  'expose',
  'duration',
  'performance',
  'custom',
]);

const platformSchema = z.enum([
  'web',
  'miniapp',
  'ios',
  'android',
  'rn',
  'flutter',
]);

export const trackEventSchema = z.object({
  eventId: z.string().uuid(),
  eventName: z.string().min(1),
  eventType: eventTypeSchema,
  timestamp: z.number().positive(),
  serverTime: z.number().positive().optional(),

  userId: z.string().optional(),
  deviceId: z.string().min(1),
  sessionId: z.string().min(1),

  platform: platformSchema,
  appId: z.string().min(1),
  appVersion: z.string(),
  sdkVersion: z.string(),

  pageUrl: z.string().optional(),
  pageTitle: z.string().optional(),
  referrer: z.string().optional(),

  properties: z.record(z.unknown()),
});

export const batchPayloadSchema = z.object({
  events: z.array(trackEventSchema),
  sentAt: z.number().positive(),
});

export function validateEvent(event: unknown): event is TrackEvent {
  const result = trackEventSchema.safeParse(event);
  return result.success;
}

export function validateEventWithErrors(event: unknown): {
  valid: boolean;
  errors?: string[];
} {
  const result = trackEventSchema.safeParse(event);
  if (result.success) {
    return { valid: true };
  }
  return {
    valid: false,
    errors: result.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    ),
  };
}

export class SchemaValidator {
  private schemas: Map<string, EventSchema> = new Map();

  constructor(config?: SchemaConfig) {
    if (config) {
      this.loadSchema(config);
    }
  }

  loadSchema(config: SchemaConfig): void {
    this.schemas.clear();
    for (const event of config.events) {
      this.schemas.set(event.name, event);
    }
  }

  validate(eventName: string, properties: Record<string, unknown>): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const schema = this.schemas.get(eventName);

    if (!schema) {
      warnings.push(`Event "${eventName}" is not defined in schema`);
      return { valid: true, warnings };
    }

    for (const prop of schema.properties) {
      const value = properties[prop.name];

      if (prop.required && value === undefined) {
        warnings.push(
          `Required property "${prop.name}" is missing for event "${eventName}"`
        );
        continue;
      }

      if (value !== undefined) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== prop.type && prop.type !== 'object') {
          warnings.push(
            `Property "${prop.name}" should be ${prop.type}, got ${actualType}`
          );
        }
      }
    }

    return { valid: warnings.length === 0, warnings };
  }

  getSchema(eventName: string): EventSchema | undefined {
    return this.schemas.get(eventName);
  }

  getAllSchemas(): EventSchema[] {
    return Array.from(this.schemas.values());
  }
}
