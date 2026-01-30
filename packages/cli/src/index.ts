#!/usr/bin/env node
// packages/cli/src/index.ts

import { Command } from 'commander';
import { serve } from './commands/serve';
import { init } from './commands/init';
import { generateDocs } from './commands/docs';

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
  .option('-p, --port <port>', 'Server port', '3000')
  .option('-h, --host <host>', 'Server host', '0.0.0.0')
  .option('-d, --database <path>', 'Database file path', './data/track.db')
  .action(async (options) => {
    await serve({
      port: parseInt(options.port, 10),
      host: options.host,
      database: options.database,
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

program.parse();
