// packages/server/src/routes/api.ts

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { TrackDatabase } from '../database';

const eventTypeEnum = z.enum([
  'page_view',
  'click',
  'expose',
  'duration',
  'performance',
  'custom',
]);

const eventsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  eventName: z.string().optional(),
  eventType: eventTypeEnum.optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 100))
    .pipe(z.number().int().min(1).max(1000)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().int().min(0)),
});

const recentEventsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(1000)),
});

export function registerApiRoutes(
  app: FastifyInstance,
  db: TrackDatabase
): void {
  // Get events list
  app.get('/api/events', async (request, reply) => {
    const parseResult = eventsQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      });
    }

    const query = parseResult.data;

    const events = db.queryEvents({
      startDate: query.startDate,
      endDate: query.endDate,
      eventName: query.eventName,
      eventType: query.eventType,
      limit: query.limit,
      offset: query.offset,
    });

    return { events, total: events.length };
  });

  // Get overview stats
  app.get('/api/stats/overview', async (request) => {
    const query = request.query as {
      startDate?: string;
      endDate?: string;
    };

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const startDate = query.startDate ?? sevenDaysAgo;
    const endDate = query.endDate ?? today;

    const dailyStats = db.getOverviewStats(startDate, endDate);
    const todayStats = db.getTodayStats();

    return {
      today: todayStats,
      daily: dailyStats,
    };
  });

  // Get event stats
  app.get('/api/stats/events', async (request) => {
    const query = request.query as {
      startDate?: string;
      endDate?: string;
    };

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const startDate = query.startDate ?? sevenDaysAgo;
    const endDate = query.endDate ?? today;

    const stats = db.getEventStats(startDate, endDate);

    return { stats };
  });

  // Get recent events (for real-time feed)
  app.get('/api/events/recent', async (request, reply) => {
    const parseResult = recentEventsQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      });
    }

    const { limit } = parseResult.data;

    const events = db.getRecentEvents(limit);

    return { events };
  });

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });
}
