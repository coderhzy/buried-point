// packages/cli/src/commands/serve.ts

import { createServer } from 'buried-point-server';
import fs from 'fs';
import path from 'path';

export interface ServeOptions {
  port: number;
  host: string;
  database: string;
  dashboard?: string;
}

export async function serve(options: ServeOptions): Promise<void> {
  const { port, host, database, dashboard } = options;

  // Ensure data directory exists
  const dataDir = path.dirname(database);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Resolve dashboard path
  let dashboardPath: string | undefined;
  if (dashboard) {
    dashboardPath = path.resolve(dashboard);
    if (!fs.existsSync(dashboardPath)) {
      console.warn(`Dashboard directory not found: ${dashboardPath}`);
      dashboardPath = undefined;
    }
  }

  console.log(`Starting server...`);
  console.log(`  Port: ${port}`);
  console.log(`  Host: ${host}`);
  console.log(`  Database: ${database}`);
  if (dashboardPath) {
    console.log(`  Dashboard: ${dashboardPath}`);
  }

  const server = createServer({
    port,
    host,
    database,
    dashboard: dashboardPath,
    cors: ['*'],
    logger: true,
  });

  // Handle shutdown gracefully
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });

  await server.start();
}
