// packages/server/src/server.ts

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'fs';
import { join } from 'path';
import type { SchemaConfig } from 'buried-point-core';
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
  dashboard?: string; // Dashboard 静态文件目录
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
    dashboard,
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

  // 提供 Dashboard 静态文件
  if (dashboard && existsSync(dashboard)) {
    app.register(fastifyStatic, {
      root: dashboard,
      prefix: '/',
      decorateReply: false,
    });

    // SPA fallback - 所有非 API 路由返回 index.html
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api') || request.url.startsWith('/track')) {
        reply.code(404).send({ error: 'Not Found' });
      } else {
        reply.sendFile('index.html');
      }
    });

    console.log(`Dashboard enabled from: ${dashboard}`);
  }

  const start = async (): Promise<void> => {
    try {
      await app.listen({ port, host });
      console.log(`Server running at http://${host}:${port}`);
      if (dashboard) {
        console.log(`Dashboard available at http://${host}:${port}`);
      }
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
