// packages/server/src/routes/api.ts

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { TrackDatabase } from '../database';
import type { SchemaConfig } from 'buried-point-core';

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

const funnelQuerySchema = z.object({
  steps: z.string().min(1, 'steps parameter is required'),
  startDate: z.string().min(1, 'startDate parameter is required'),
  endDate: z.string().min(1, 'endDate parameter is required'),
});

const retentionQuerySchema = z.object({
  startDate: z.string().min(1, 'startDate parameter is required'),
  endDate: z.string().min(1, 'endDate parameter is required'),
  days: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 7))
    .pipe(z.number().int().min(1).max(30)),
});

export function registerApiRoutes(
  app: FastifyInstance,
  db: TrackDatabase,
  schemaConfig?: SchemaConfig
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

  // Get funnel analysis
  app.get('/api/stats/funnel', async (request, reply) => {
    const parseResult = funnelQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      });
    }

    const { steps, startDate, endDate } = parseResult.data;

    // Parse comma-separated steps
    const stepNames = steps.split(',').map((s) => s.trim()).filter((s) => s.length > 0);

    if (stepNames.length === 0) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: ['steps: At least one step is required'],
      });
    }

    const analysis = db.getFunnelAnalysis(stepNames, startDate, endDate);

    return analysis;
  });

  // Get retention analysis
  app.get('/api/stats/retention', async (request, reply) => {
    const parseResult = retentionQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      });
    }

    const { startDate, endDate, days } = parseResult.data;

    const analysis = db.getRetentionAnalysis(startDate, endDate, days);

    return analysis;
  });

  // Get schema configuration
  app.get('/api/schema', async () => {
    if (!schemaConfig) {
      return { available: false, schema: null };
    }

    return { available: true, schema: schemaConfig };
  });

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });
}
