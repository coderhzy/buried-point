// packages/cli/src/commands/export.ts

import fs from 'fs';
import path from 'path';
import { TrackDatabase } from '@buried-point/server';
import type { TrackEvent } from '@buried-point/core';

export interface ExportOptions {
  database: string;
  from?: string;
  to?: string;
  format: 'json' | 'csv';
  output?: string;
  eventName?: string;
  eventType?: string;
  limit?: number;
}

export async function exportEvents(options: ExportOptions): Promise<void> {
  const { database, from, to, format, output, eventName, eventType, limit } = options;

  // Check if database file exists
  if (!fs.existsSync(database)) {
    console.error(`Error: Database file not found: ${database}`);
    process.exit(1);
  }

  // Open database
  const db = new TrackDatabase({ path: database });

  try {
    // Query events
    const events = db.queryEvents({
      startDate: from,
      endDate: to,
      eventName,
      eventType,
      limit,
    });

    if (events.length === 0) {
      console.error('No events found matching the criteria.');
      process.exit(0);
    }

    // Format output
    let outputData: string;
    if (format === 'json') {
      outputData = formatAsJson(events);
    } else {
      outputData = formatAsCsv(events);
    }

    // Write output
    if (output) {
      const outputDir = path.dirname(output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(output, outputData);
      console.error(`Exported ${events.length} events to ${output}`);
    } else {
      // Output to stdout
      console.log(outputData);
    }
  } finally {
    db.close();
  }
}

function formatAsJson(events: TrackEvent[]): string {
  return JSON.stringify(events, null, 2);
}

function formatAsCsv(events: TrackEvent[]): string {
  if (events.length === 0) {
    return '';
  }

  // Define CSV columns
  const columns = [
    'eventId',
    'eventName',
    'eventType',
    'timestamp',
    'serverTime',
    'userId',
    'deviceId',
    'sessionId',
    'platform',
    'appId',
    'appVersion',
    'sdkVersion',
    'pageUrl',
    'pageTitle',
    'referrer',
    'properties',
  ];

  // Header row
  const rows: string[] = [columns.join(',')];

  // Data rows
  for (const event of events) {
    const row = columns.map((col) => {
      const value = event[col as keyof TrackEvent];
      if (value === undefined || value === null) {
        return '';
      }
      if (col === 'properties') {
        // Stringify and escape properties object
        return escapeCsvValue(JSON.stringify(value));
      }
      if (col === 'timestamp' || col === 'serverTime') {
        // Format timestamp as ISO string
        return new Date(value as number).toISOString();
      }
      return escapeCsvValue(String(value));
    });
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

function escapeCsvValue(value: string): string {
  // If value contains comma, newline, or double quote, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
