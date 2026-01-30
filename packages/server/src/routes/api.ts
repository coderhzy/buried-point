// packages/server/src/routes/api.ts

import type { FastifyInstance } from 'fastify';
import type { TrackDatabase } from '../database';

export function registerApiRoutes(
  app: FastifyInstance,
  db: TrackDatabase
): void {
  // Get events list
  app.get('/api/events', async (request) => {
    const query = request.query as {
      startDate?: string;
      endDate?: string;
      eventName?: string;
      eventType?: string;
      limit?: string;
      offset?: string;
    };

    const events = db.queryEvents({
      startDate: query.startDate,
      endDate: query.endDate,
      eventName: query.eventName,
      eventType: query.eventType,
      limit: query.limit ? parseInt(query.limit, 10) : 100,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
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
  app.get('/api/events/recent', async (request) => {
    const query = request.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 20;

    const events = db.getRecentEvents(limit);

    return { events };
  });

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });
}
