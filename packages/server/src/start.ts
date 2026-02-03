// packages/server/src/start.ts
// 开发环境启动脚本

import { createServer } from './server';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const dbPath = './data/track.db';

// 确保数据目录存在
mkdirSync(dirname(dbPath), { recursive: true });

const server = createServer({
  port: 1024,
  host: '0.0.0.0',
  database: dbPath,
  cors: ['*'],
  logger: true,
});

server.start();
