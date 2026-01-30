// packages/server/src/database.ts

import Database from 'better-sqlite3';
import type { TrackEvent } from '@buried-point/core';

export interface DatabaseConfig {
  path: string;
}

export interface QueryOptions {
  startDate?: string;
  endDate?: string;
  eventName?: string;
  eventType?: string;
  limit?: number;
  offset?: number;
}

export interface DailyStats {
  date: string;
  pv: number;
  uv: number;
  eventCount: number;
}

export interface EventStats {
  eventName: string;
  eventType: string;
  count: number;
}

export class TrackDatabase {
  private db: Database.Database;

  constructor(config: DatabaseConfig) {
    this.db = new Database(config.path);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT UNIQUE NOT NULL,
        event_name TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        server_time INTEGER NOT NULL,
        user_id TEXT,
        device_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        app_id TEXT NOT NULL,
        app_version TEXT,
        sdk_version TEXT,
        page_url TEXT,
        page_title TEXT,
        referrer TEXT,
        properties TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
      CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id);
      CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);

      CREATE TABLE IF NOT EXISTS daily_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        app_id TEXT NOT NULL,
        pv INTEGER DEFAULT 0,
        uv INTEGER DEFAULT 0,
        event_count INTEGER DEFAULT 0,
        UNIQUE(date, app_id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT UNIQUE NOT NULL,
        user_id TEXT,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        session_count INTEGER DEFAULT 1,
        properties TEXT
      );
    `);
  }

  insertEvent(event: TrackEvent): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO events (
        event_id, event_name, event_type, timestamp, server_time,
        user_id, device_id, session_id, platform, app_id,
        app_version, sdk_version, page_url, page_title, referrer, properties
      ) VALUES (
        @eventId, @eventName, @eventType, @timestamp, @serverTime,
        @userId, @deviceId, @sessionId, @platform, @appId,
        @appVersion, @sdkVersion, @pageUrl, @pageTitle, @referrer, @properties
      )
    `);

    stmt.run({
      eventId: event.eventId,
      eventName: event.eventName,
      eventType: event.eventType,
      timestamp: event.timestamp,
      serverTime: event.serverTime ?? Date.now(),
      userId: event.userId ?? null,
      deviceId: event.deviceId,
      sessionId: event.sessionId,
      platform: event.platform,
      appId: event.appId,
      appVersion: event.appVersion,
      sdkVersion: event.sdkVersion,
      pageUrl: event.pageUrl ?? null,
      pageTitle: event.pageTitle ?? null,
      referrer: event.referrer ?? null,
      properties: JSON.stringify(event.properties),
    });

    // Update user
    this.upsertUser(event);

    // Update daily stats
    this.updateDailyStats(event);
  }

  insertEvents(events: TrackEvent[]): void {
    const transaction = this.db.transaction((events: TrackEvent[]) => {
      for (const event of events) {
        this.insertEvent(event);
      }
    });
    transaction(events);
  }

  private upsertUser(event: TrackEvent): void {
    // First, check if this session already exists for this user
    const existingSession = this.db.prepare(`
      SELECT 1 FROM events
      WHERE device_id = @deviceId AND session_id = @sessionId
      LIMIT 1
    `).get({
      deviceId: event.deviceId,
      sessionId: event.sessionId,
    });

    const isNewSession = !existingSession;

    const stmt = this.db.prepare(`
      INSERT INTO users (device_id, user_id, first_seen, last_seen, session_count)
      VALUES (@deviceId, @userId, @timestamp, @timestamp, 1)
      ON CONFLICT(device_id) DO UPDATE SET
        user_id = COALESCE(@userId, user_id),
        last_seen = @timestamp,
        session_count = session_count + @sessionIncrement
    `);

    stmt.run({
      deviceId: event.deviceId,
      userId: event.userId ?? null,
      timestamp: event.timestamp,
      sessionIncrement: isNewSession ? 1 : 0,
    });
  }

  private updateDailyStats(event: TrackEvent): void {
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    const isPV = event.eventType === 'page_view';

    this.db.prepare(`
      INSERT INTO daily_stats (date, app_id, pv, uv, event_count)
      VALUES (@date, @appId, @pv, 0, 1)
      ON CONFLICT(date, app_id) DO UPDATE SET
        pv = pv + @pv,
        event_count = event_count + 1
    `).run({
      date,
      appId: event.appId,
      pv: isPV ? 1 : 0,
    });

    // Update UV (count distinct devices)
    const uvCount = this.db.prepare(`
      SELECT COUNT(DISTINCT device_id) as uv
      FROM events
      WHERE date(datetime(timestamp/1000, 'unixepoch')) = @date
        AND app_id = @appId
    `).get({ date, appId: event.appId }) as { uv: number };

    this.db.prepare(`
      UPDATE daily_stats SET uv = @uv WHERE date = @date AND app_id = @appId
    `).run({ date, appId: event.appId, uv: uvCount.uv });
  }

  queryEvents(options: QueryOptions = {}): TrackEvent[] {
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params: Record<string, unknown> = {};

    if (options.startDate) {
      sql += ' AND timestamp >= @startDate';
      params.startDate = new Date(options.startDate).getTime();
    }

    if (options.endDate) {
      sql += ' AND timestamp <= @endDate';
      params.endDate = new Date(options.endDate).getTime();
    }

    if (options.eventName) {
      sql += ' AND event_name = @eventName';
      params.eventName = options.eventName;
    }

    if (options.eventType) {
      sql += ' AND event_type = @eventType';
      params.eventType = options.eventType;
    }

    sql += ' ORDER BY timestamp DESC';

    if (options.limit) {
      sql += ' LIMIT @limit';
      params.limit = options.limit;
    }

    if (options.offset) {
      sql += ' OFFSET @offset';
      params.offset = options.offset;
    }

    const rows = this.db.prepare(sql).all(params) as Array<Record<string, unknown>>;
    return rows.map(this.rowToEvent);
  }

  private rowToEvent(row: Record<string, unknown>): TrackEvent {
    return {
      eventId: row.event_id as string,
      eventName: row.event_name as string,
      eventType: row.event_type as TrackEvent['eventType'],
      timestamp: row.timestamp as number,
      serverTime: row.server_time as number,
      userId: row.user_id as string | undefined,
      deviceId: row.device_id as string,
      sessionId: row.session_id as string,
      platform: row.platform as TrackEvent['platform'],
      appId: row.app_id as string,
      appVersion: row.app_version as string,
      sdkVersion: row.sdk_version as string,
      pageUrl: row.page_url as string | undefined,
      pageTitle: row.page_title as string | undefined,
      referrer: row.referrer as string | undefined,
      properties: JSON.parse(row.properties as string),
    };
  }

  getOverviewStats(startDate: string, endDate: string): DailyStats[] {
    const rows = this.db.prepare(`
      SELECT date, SUM(pv) as pv, SUM(uv) as uv, SUM(event_count) as eventCount
      FROM daily_stats
      WHERE date >= @startDate AND date <= @endDate
      GROUP BY date
      ORDER BY date ASC
    `).all({ startDate, endDate }) as DailyStats[];

    return rows;
  }

  getEventStats(startDate: string, endDate: string): EventStats[] {
    const rows = this.db.prepare(`
      SELECT event_name as eventName, event_type as eventType, COUNT(*) as count
      FROM events
      WHERE timestamp >= @startTs AND timestamp <= @endTs
      GROUP BY event_name, event_type
      ORDER BY count DESC
    `).all({
      startTs: new Date(startDate).getTime(),
      endTs: new Date(endDate).getTime(),
    }) as EventStats[];

    return rows;
  }

  getTodayStats(): { pv: number; uv: number; eventCount: number } {
    const today = new Date().toISOString().split('T')[0];
    const row = this.db.prepare(`
      SELECT COALESCE(SUM(pv), 0) as pv,
             COALESCE(SUM(uv), 0) as uv,
             COALESCE(SUM(event_count), 0) as eventCount
      FROM daily_stats
      WHERE date = @today
    `).get({ today }) as { pv: number; uv: number; eventCount: number };

    return row;
  }

  getRecentEvents(limit = 20): TrackEvent[] {
    return this.queryEvents({ limit });
  }

  close(): void {
    this.db.close();
  }
}
