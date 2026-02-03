#!/usr/bin/env node
// packages/cli/src/index.ts

import { Command } from 'commander';
import { serve } from './commands/serve';
import { init } from './commands/init';
import { generateDocs } from './commands/docs';
import { validate } from './commands/validate';
import { exportEvents } from './commands/export';

const program = new Command();

program
  .name('bp')
  .description('Buried Point CLI - Analytics tracking toolkit')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize buried-point configuration')
  .argument('[dir]', 'Directory to initialize', '.')
  .action(async (dir) => {
    await init(dir);
  });

program
  .command('serve')
  .description('Start the tracking server')
  .option('-p, --port <port>', 'Server port', '1024')
  .option('-h, --host <host>', 'Server host', '0.0.0.0')
  .option('-d, --database <path>', 'Database file path', './data/track.db')
  .option('--dashboard <path>', 'Dashboard static files directory')
  .action(async (options) => {
    await serve({
      port: parseInt(options.port, 10),
      host: options.host,
      database: options.database,
      dashboard: options.dashboard,
    });
  });

program
  .command('docs')
  .description('Generate documentation from schema')
  .option('-s, --schema <path>', 'Schema file path', './track-schema.yaml')
  .option('-o, --output <path>', 'Output file path', './docs/track-events.md')
  .action(async (options) => {
    await generateDocs(options.schema, options.output);
  });

program
  .command('dashboard')
  .description('Start the dashboard server')
  .option('-p, --port <port>', 'Dashboard port', '8080')
  .action(async (options) => {
    console.log(`Dashboard will start on port ${options.port}`);
    console.log('Note: Dashboard package needs to be implemented first');
    // TODO: Implement dashboard command after dashboard package is ready
  });

program
  .command('validate')
  .description('Validate the track-schema.yaml file')
  .option('-s, --schema <path>', 'Schema file path', './track-schema.yaml')
  .action(async (options) => {
    await validate(options.schema);
  });

program
  .command('export')
  .description('Export events data from the database')
  .option('-d, --database <path>', 'Database file path', './data/track.db')
  .option('--from <date>', 'Start date (ISO format, e.g., 2024-01-01)')
  .option('--to <date>', 'End date (ISO format, e.g., 2024-12-31)')
  .option('-f, --format <format>', 'Output format (json|csv)', 'json')
  .option('-o, --output <path>', 'Output file path (defaults to stdout)')
  .option('-e, --event-name <name>', 'Filter by event name')
  .option('-t, --event-type <type>', 'Filter by event type')
  .option('-l, --limit <count>', 'Limit number of events')
  .action(async (options) => {
    await exportEvents({
      database: options.database,
      from: options.from,
      to: options.to,
      format: options.format as 'json' | 'csv',
      output: options.output,
      eventName: options.eventName,
      eventType: options.eventType,
      limit: options.limit ? parseInt(options.limit, 10) : undefined,
    });
  });

program.parse();
