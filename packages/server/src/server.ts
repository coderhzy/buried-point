// packages/server/src/server.ts

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { SchemaConfig } from '@buried-point/core';
import { TrackDatabase } from './database';
import { registerTrackRoutes } from './routes/track';
import { registerApiRoutes } from './routes/api';

export interface ServerConfig {
  port?: number;
  host?: string;
  database?: string;
  cors?: string[];
  logger?: boolean;
  schema?: SchemaConfig;
}

export interface TrackServer {
  app: FastifyInstance;
  db: TrackDatabase;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export function createServer(config: ServerConfig = {}): TrackServer {
  const {
    port = 1024,
    host = '0.0.0.0',
    database = './data/track.db',
    cors: corsOrigins = ['*'],
    logger = true,
    schema: schemaConfig,
  } = config;

  const app = Fastify({ logger });
  const db = new TrackDatabase({ path: database });

  // Register CORS
  app.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // Register routes
  registerTrackRoutes(app, db);
  registerApiRoutes(app, db, schemaConfig);

  const start = async (): Promise<void> => {
    try {
      await app.listen({ port, host });
      console.log(`Server running at http://${host}:${port}`);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };

  const stop = async (): Promise<void> => {
    db.close();
    await app.close();
  };

  return { app, db, start, stop };
}
