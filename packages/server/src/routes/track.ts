// packages/server/src/routes/track.ts

import type { FastifyInstance } from 'fastify';
import { batchPayloadSchema, validateEvent } from '@buried-point/core';
import type { TrackEvent, BatchPayload } from '@buried-point/core';
import type { TrackDatabase } from '../database';

export function registerTrackRoutes(
  app: FastifyInstance,
  db: TrackDatabase
): void {
  // Single event
  app.post('/track', async (request, reply) => {
    const event = request.body as TrackEvent;

    if (!validateEvent(event)) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid event format',
      });
    }

    try {
      const eventWithServerTime = {
        ...event,
        serverTime: Date.now(),
      };
      db.insertEvent(eventWithServerTime);

      return {
        success: true,
        eventIds: [event.eventId],
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to save event',
      });
    }
  });

  // Batch events
  app.post('/track/batch', async (request, reply) => {
    const payload = request.body as BatchPayload;
    const parseResult = batchPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid batch payload',
        errors: parseResult.error.errors,
      });
    }

    try {
      const serverTime = Date.now();
      const eventsWithServerTime = payload.events.map((e) => ({
        ...e,
        serverTime,
      }));
      db.insertEvents(eventsWithServerTime);

      return {
        success: true,
        eventIds: payload.events.map((e) => e.eventId),
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to save events',
      });
    }
  });
}
