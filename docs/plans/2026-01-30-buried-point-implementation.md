# Buried Point 埋点统计 NPM 包实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个全栈埋点统计 NPM 包，包含 Web SDK、后端服务、可视化 Dashboard 和 CLI 工具。

**Architecture:** Monorepo 结构使用 pnpm workspace + Turborepo。SDK 通过 HTTP 上报到 Fastify 服务端，数据存储在 SQLite，Dashboard 使用 React + ECharts 展示。

**Tech Stack:** TypeScript, pnpm, Turborepo, Zod, Rollup, Fastify, better-sqlite3, React 18, ECharts, TailwindCSS, Vite, Commander.js, Vitest

---

## Task 1: 初始化 Monorepo 项目结构

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.npmrc`

**Step 1: 创建根 package.json**

```json
{
  "name": "buried-point-monorepo",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=18"
  }
}
```

**Step 2: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
```

**Step 3: 创建 turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Step 4: 创建 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  }
}
```

**Step 5: 创建 .gitignore**

```
node_modules/
dist/
.turbo/
*.log
.DS_Store
coverage/
*.db
.env
.env.local
```

**Step 6: 创建 .npmrc**

```
auto-install-peers=true
strict-peer-dependencies=false
```

**Step 7: 创建包目录结构**

```bash
mkdir -p packages/core/src
mkdir -p packages/sdk-web/src
mkdir -p packages/server/src
mkdir -p packages/dashboard/src
mkdir -p packages/cli/src
```

**Step 8: 安装依赖并验证**

Run: `pnpm install`
Expected: 成功安装依赖

**Step 9: Commit**

```bash
git add .
git commit -m "chore: initialize monorepo with pnpm and turborepo"
```

---

## Task 2: 实现 @buried-point/core 包

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/types.ts`
- Create: `packages/core/src/schema.ts`
- Create: `packages/core/src/utils.ts`
- Create: `packages/core/src/__tests__/schema.test.ts`

**Step 1: 创建 core package.json**

```json
{
  "name": "@buried-point/core",
  "version": "0.1.0",
  "description": "Core types and utilities for buried-point",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "vitest": "^1.6.0"
  },
  "dependencies": {
    "zod": "^3.23.0",
    "uuid": "^9.0.0"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**Step 2: 创建 core tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: 创建 types.ts - 核心类型定义**

```typescript
// packages/core/src/types.ts

export type EventType =
  | 'page_view'
  | 'click'
  | 'expose'
  | 'duration'
  | 'performance'
  | 'custom';

export type Platform = 'web' | 'miniapp' | 'ios' | 'android' | 'rn' | 'flutter';

export interface TrackEvent {
  eventId: string;
  eventName: string;
  eventType: EventType;
  timestamp: number;
  serverTime?: number;

  userId?: string;
  deviceId: string;
  sessionId: string;

  platform: Platform;
  appId: string;
  appVersion: string;
  sdkVersion: string;

  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;

  properties: Record<string, unknown>;
}

export interface UserInfo {
  userId?: string;
  deviceId: string;
  [key: string]: unknown;
}

export interface PageInfo {
  pageUrl: string;
  pageTitle?: string;
  referrer?: string;
}

export interface PerformanceData {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
}

export interface TrackerConfig {
  serverUrl: string;
  appId: string;
  appVersion: string;
  debug?: boolean;
  batchSize?: number;
  flushInterval?: number;
  schema?: SchemaConfig;
}

export interface SchemaConfig {
  version: string;
  events: EventSchema[];
}

export interface EventSchema {
  name: string;
  description?: string;
  type: EventType;
  module?: string;
  owner?: string;
  properties: PropertySchema[];
}

export interface PropertySchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  description?: string;
}

export interface BatchPayload {
  events: TrackEvent[];
  sentAt: number;
}

export interface ServerResponse {
  success: boolean;
  message?: string;
  eventIds?: string[];
}
```

**Step 4: 创建 schema.ts - Schema 验证**

```typescript
// packages/core/src/schema.ts

import { z } from 'zod';
import type { EventSchema, SchemaConfig, TrackEvent } from './types';

const eventTypeSchema = z.enum([
  'page_view',
  'click',
  'expose',
  'duration',
  'performance',
  'custom',
]);

const platformSchema = z.enum([
  'web',
  'miniapp',
  'ios',
  'android',
  'rn',
  'flutter',
]);

export const trackEventSchema = z.object({
  eventId: z.string().uuid(),
  eventName: z.string().min(1),
  eventType: eventTypeSchema,
  timestamp: z.number().positive(),
  serverTime: z.number().positive().optional(),

  userId: z.string().optional(),
  deviceId: z.string().min(1),
  sessionId: z.string().min(1),

  platform: platformSchema,
  appId: z.string().min(1),
  appVersion: z.string(),
  sdkVersion: z.string(),

  pageUrl: z.string().optional(),
  pageTitle: z.string().optional(),
  referrer: z.string().optional(),

  properties: z.record(z.unknown()),
});

export const batchPayloadSchema = z.object({
  events: z.array(trackEventSchema),
  sentAt: z.number().positive(),
});

export function validateEvent(event: unknown): event is TrackEvent {
  const result = trackEventSchema.safeParse(event);
  return result.success;
}

export function validateEventWithErrors(event: unknown): {
  valid: boolean;
  errors?: string[];
} {
  const result = trackEventSchema.safeParse(event);
  if (result.success) {
    return { valid: true };
  }
  return {
    valid: false,
    errors: result.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    ),
  };
}

export class SchemaValidator {
  private schemas: Map<string, EventSchema> = new Map();

  constructor(config?: SchemaConfig) {
    if (config) {
      this.loadSchema(config);
    }
  }

  loadSchema(config: SchemaConfig): void {
    this.schemas.clear();
    for (const event of config.events) {
      this.schemas.set(event.name, event);
    }
  }

  validate(eventName: string, properties: Record<string, unknown>): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const schema = this.schemas.get(eventName);

    if (!schema) {
      warnings.push(`Event "${eventName}" is not defined in schema`);
      return { valid: true, warnings };
    }

    for (const prop of schema.properties) {
      const value = properties[prop.name];

      if (prop.required && value === undefined) {
        warnings.push(
          `Required property "${prop.name}" is missing for event "${eventName}"`
        );
        continue;
      }

      if (value !== undefined) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== prop.type && prop.type !== 'object') {
          warnings.push(
            `Property "${prop.name}" should be ${prop.type}, got ${actualType}`
          );
        }
      }
    }

    return { valid: warnings.length === 0, warnings };
  }

  getSchema(eventName: string): EventSchema | undefined {
    return this.schemas.get(eventName);
  }

  getAllSchemas(): EventSchema[] {
    return Array.from(this.schemas.values());
  }
}
```

**Step 5: 创建 utils.ts - 工具函数**

```typescript
// packages/core/src/utils.ts

import { v4 as uuidv4 } from 'uuid';

export function generateEventId(): string {
  return uuidv4();
}

export function generateDeviceId(): string {
  return `device_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

export function generateSessionId(): string {
  return `session_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

export function getCurrentTimestamp(): number {
  return Date.now();
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function parseYamlSchema(content: string): unknown {
  // 简单的 YAML 解析，只支持基本格式
  // 实际使用时可以引入 yaml 库
  const lines = content.split('\n');
  const result: Record<string, unknown> = {};
  let currentKey = '';
  let indent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (value) {
        result[key] = value.replace(/^["']|["']$/g, '');
      } else {
        result[key] = {};
        currentKey = key;
      }
    }
  }

  return result;
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export const SDK_VERSION = '0.1.0';
```

**Step 6: 创建 index.ts - 导出**

```typescript
// packages/core/src/index.ts

export * from './types';
export * from './schema';
export * from './utils';
```

**Step 7: 创建测试文件**

```typescript
// packages/core/src/__tests__/schema.test.ts

import { describe, it, expect } from 'vitest';
import {
  validateEvent,
  validateEventWithErrors,
  SchemaValidator,
} from '../schema';
import { generateEventId, generateDeviceId, generateSessionId } from '../utils';
import type { TrackEvent, SchemaConfig } from '../types';

describe('validateEvent', () => {
  it('should validate a correct event', () => {
    const event: TrackEvent = {
      eventId: generateEventId(),
      eventName: 'button_click',
      eventType: 'click',
      timestamp: Date.now(),
      deviceId: generateDeviceId(),
      sessionId: generateSessionId(),
      platform: 'web',
      appId: 'test-app',
      appVersion: '1.0.0',
      sdkVersion: '0.1.0',
      properties: { buttonId: 'submit' },
    };

    expect(validateEvent(event)).toBe(true);
  });

  it('should reject invalid event', () => {
    const event = {
      eventName: 'test',
      // missing required fields
    };

    expect(validateEvent(event)).toBe(false);
  });

  it('should return errors for invalid event', () => {
    const event = {
      eventName: 'test',
      eventType: 'invalid_type',
    };

    const result = validateEventWithErrors(event);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });
});

describe('SchemaValidator', () => {
  const schemaConfig: SchemaConfig = {
    version: '1.0',
    events: [
      {
        name: 'button_click',
        description: 'Button click event',
        type: 'click',
        properties: [
          { name: 'button_id', type: 'string', required: true },
          { name: 'button_text', type: 'string', required: false },
        ],
      },
    ],
  };

  it('should validate properties against schema', () => {
    const validator = new SchemaValidator(schemaConfig);
    const result = validator.validate('button_click', {
      button_id: 'submit',
      button_text: 'Submit',
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should warn for missing required property', () => {
    const validator = new SchemaValidator(schemaConfig);
    const result = validator.validate('button_click', {
      button_text: 'Submit',
    });

    expect(result.valid).toBe(false);
    expect(result.warnings).toContain(
      'Required property "button_id" is missing for event "button_click"'
    );
  });

  it('should warn for undefined event', () => {
    const validator = new SchemaValidator(schemaConfig);
    const result = validator.validate('unknown_event', {});

    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      'Event "unknown_event" is not defined in schema'
    );
  });

  it('should warn for wrong property type', () => {
    const validator = new SchemaValidator(schemaConfig);
    const result = validator.validate('button_click', {
      button_id: 123, // should be string
    });

    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.includes('should be string'))).toBe(
      true
    );
  });
});
```

**Step 8: 安装 core 依赖并测试**

Run: `cd packages/core && pnpm install && pnpm test`
Expected: 所有测试通过

**Step 9: 构建 core 包**

Run: `pnpm build`
Expected: 成功生成 dist 目录

**Step 10: Commit**

```bash
git add .
git commit -m "feat(core): add core types, schema validation and utilities"
```

---

## Task 3: 实现 @buried-point/sdk-web 包

**Files:**
- Create: `packages/sdk-web/package.json`
- Create: `packages/sdk-web/tsconfig.json`
- Create: `packages/sdk-web/src/index.ts`
- Create: `packages/sdk-web/src/tracker.ts`
- Create: `packages/sdk-web/src/transport.ts`
- Create: `packages/sdk-web/src/auto-track.ts`
- Create: `packages/sdk-web/src/storage.ts`
- Create: `packages/sdk-web/src/__tests__/tracker.test.ts`

**Step 1: 创建 sdk-web package.json**

```json
{
  "name": "@buried-point/sdk-web",
  "version": "0.1.0",
  "description": "Web SDK for buried-point analytics",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "vitest": "^1.6.0",
    "jsdom": "^24.0.0",
    "@vitest/coverage-v8": "^1.6.0"
  },
  "dependencies": {
    "@buried-point/core": "workspace:*"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**Step 2: 创建 sdk-web tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022", "DOM"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: 创建 storage.ts - 本地存储**

```typescript
// packages/sdk-web/src/storage.ts

const STORAGE_PREFIX = 'bp_';

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

class LocalStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return localStorage.getItem(STORAGE_PREFIX + key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, value);
    } catch {
      // Storage full or disabled
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      // Storage disabled
    }
  }
}

class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  get(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  remove(key: string): void {
    this.store.delete(key);
  }
}

export function createStorage(): StorageAdapter {
  try {
    const testKey = '__bp_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return new LocalStorageAdapter();
  } catch {
    return new MemoryStorageAdapter();
  }
}

export const storage = createStorage();
```

**Step 4: 创建 transport.ts - 网络传输**

```typescript
// packages/sdk-web/src/transport.ts

import type { TrackEvent, BatchPayload, ServerResponse } from '@buried-point/core';

export interface TransportConfig {
  serverUrl: string;
  timeout?: number;
  retries?: number;
}

export class Transport {
  private config: TransportConfig;
  private queue: TrackEvent[] = [];
  private sending = false;

  constructor(config: TransportConfig) {
    this.config = {
      timeout: 10000,
      retries: 3,
      ...config,
    };
  }

  async send(events: TrackEvent[]): Promise<ServerResponse> {
    const payload: BatchPayload = {
      events,
      sentAt: Date.now(),
    };

    let lastError: Error | null = null;

    for (let i = 0; i < this.config.retries!; i++) {
      try {
        const response = await this.doSend(payload);
        return response;
      } catch (error) {
        lastError = error as Error;
        await this.delay(Math.pow(2, i) * 1000);
      }
    }

    throw lastError;
  }

  private async doSend(payload: BatchPayload): Promise<ServerResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    try {
      const response = await fetch(this.config.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  enqueue(event: TrackEvent): void {
    this.queue.push(event);
  }

  async flush(): Promise<void> {
    if (this.sending || this.queue.length === 0) {
      return;
    }

    this.sending = true;
    const events = this.queue.splice(0, this.queue.length);

    try {
      await this.send(events);
    } catch (error) {
      // Re-queue failed events
      this.queue.unshift(...events);
      throw error;
    } finally {
      this.sending = false;
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}
```

**Step 5: 创建 auto-track.ts - 自动采集**

```typescript
// packages/sdk-web/src/auto-track.ts

import type { PerformanceData } from '@buried-point/core';

export interface AutoTrackCallbacks {
  onPageView: (data: { url: string; title: string; referrer: string }) => void;
  onDuration: (data: { url: string; duration: number }) => void;
  onPerformance: (data: PerformanceData) => void;
}

export class AutoTracker {
  private callbacks: AutoTrackCallbacks;
  private pageStartTime: number = Date.now();
  private currentUrl: string = '';
  private enabled = false;

  constructor(callbacks: AutoTrackCallbacks) {
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.enabled) return;
    this.enabled = true;

    this.currentUrl = window.location.href;
    this.pageStartTime = Date.now();

    // Track initial page view
    this.trackPageView();

    // Listen for route changes (SPA)
    this.setupRouteListener();

    // Listen for page unload (duration)
    this.setupUnloadListener();

    // Collect performance metrics
    this.collectPerformance();
  }

  stop(): void {
    this.enabled = false;
  }

  private trackPageView(): void {
    this.callbacks.onPageView({
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
    });
  }

  private setupRouteListener(): void {
    // Handle popstate (back/forward)
    window.addEventListener('popstate', () => {
      if (!this.enabled) return;
      this.handleRouteChange();
    });

    // Intercept pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      if (this.enabled) this.handleRouteChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      if (this.enabled) this.handleRouteChange();
    };
  }

  private handleRouteChange(): void {
    const newUrl = window.location.href;
    if (newUrl === this.currentUrl) return;

    // Report duration for previous page
    const duration = Date.now() - this.pageStartTime;
    this.callbacks.onDuration({
      url: this.currentUrl,
      duration,
    });

    // Update for new page
    this.currentUrl = newUrl;
    this.pageStartTime = Date.now();
    this.trackPageView();
  }

  private setupUnloadListener(): void {
    window.addEventListener('beforeunload', () => {
      if (!this.enabled) return;

      const duration = Date.now() - this.pageStartTime;
      this.callbacks.onDuration({
        url: this.currentUrl,
        duration,
      });
    });

    // Also handle visibilitychange for mobile
    document.addEventListener('visibilitychange', () => {
      if (!this.enabled) return;

      if (document.visibilityState === 'hidden') {
        const duration = Date.now() - this.pageStartTime;
        this.callbacks.onDuration({
          url: this.currentUrl,
          duration,
        });
      }
    });
  }

  private collectPerformance(): void {
    // Wait for page load
    if (document.readyState === 'complete') {
      this.reportPerformance();
    } else {
      window.addEventListener('load', () => {
        // Delay to ensure metrics are available
        setTimeout(() => this.reportPerformance(), 1000);
      });
    }
  }

  private reportPerformance(): void {
    const data: PerformanceData = {};

    // Try to get Web Vitals
    try {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      if (navigation) {
        data.ttfb = navigation.responseStart - navigation.requestStart;
      }

      // Get paint metrics
      const paintEntries = performance.getEntriesByType('paint');
      for (const entry of paintEntries) {
        if (entry.name === 'first-contentful-paint') {
          data.fcp = entry.startTime;
        }
      }

      // LCP requires PerformanceObserver
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            data.lcp = lastEntry.startTime;
            this.callbacks.onPerformance(data);
          }
        });

        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      }
    } catch {
      // Performance API not available
    }

    if (Object.keys(data).length > 0) {
      this.callbacks.onPerformance(data);
    }
  }
}
```

**Step 6: 创建 tracker.ts - 主 Tracker 类**

```typescript
// packages/sdk-web/src/tracker.ts

import {
  type TrackEvent,
  type TrackerConfig,
  type UserInfo,
  type EventType,
  type SchemaConfig,
  SchemaValidator,
  generateEventId,
  generateDeviceId,
  generateSessionId,
  SDK_VERSION,
} from '@buried-point/core';
import { Transport } from './transport';
import { storage } from './storage';
import { AutoTracker } from './auto-track';

const DEVICE_ID_KEY = 'device_id';
const SESSION_ID_KEY = 'session_id';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export class BuriedPoint {
  private config: Required<Omit<TrackerConfig, 'schema'>> & { schema?: SchemaConfig };
  private transport: Transport;
  private schemaValidator: SchemaValidator;
  private autoTracker: AutoTracker;

  private deviceId: string;
  private sessionId: string;
  private userId?: string;
  private userProperties: Record<string, unknown> = {};

  private flushTimer?: ReturnType<typeof setInterval>;

  constructor(config: TrackerConfig) {
    this.config = {
      debug: false,
      batchSize: 10,
      flushInterval: 5000,
      ...config,
    };

    this.transport = new Transport({
      serverUrl: this.config.serverUrl,
    });

    this.schemaValidator = new SchemaValidator(this.config.schema);

    this.deviceId = this.getOrCreateDeviceId();
    this.sessionId = this.getOrCreateSessionId();

    this.autoTracker = new AutoTracker({
      onPageView: (data) => this.trackPageView(data),
      onDuration: (data) => this.trackDuration(data.url, data.duration),
      onPerformance: (data) => this.trackPerformance(data),
    });

    this.startAutoFlush();
    this.autoTracker.start();

    this.log('Tracker initialized', { deviceId: this.deviceId, sessionId: this.sessionId });
  }

  private getOrCreateDeviceId(): string {
    let deviceId = storage.get(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateDeviceId();
      storage.set(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  private getOrCreateSessionId(): string {
    const stored = storage.get(SESSION_ID_KEY);
    if (stored) {
      const [sessionId, timestamp] = stored.split(':');
      if (Date.now() - parseInt(timestamp, 10) < SESSION_TIMEOUT) {
        this.refreshSession(sessionId);
        return sessionId;
      }
    }

    const sessionId = generateSessionId();
    this.refreshSession(sessionId);
    return sessionId;
  }

  private refreshSession(sessionId: string): void {
    storage.set(SESSION_ID_KEY, `${sessionId}:${Date.now()}`);
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[BuriedPoint]', ...args);
    }
  }

  private warn(...args: unknown[]): void {
    if (this.config.debug) {
      console.warn('[BuriedPoint]', ...args);
    }
  }

  setUser(user: UserInfo): void {
    this.userId = user.userId;
    const { userId, deviceId, ...rest } = user;
    this.userProperties = rest;
    this.log('User set', user);
  }

  private createEvent(
    eventName: string,
    eventType: EventType,
    properties: Record<string, unknown> = {}
  ): TrackEvent {
    // Validate against schema
    if (this.config.schema) {
      const { valid, warnings } = this.schemaValidator.validate(
        eventName,
        properties
      );
      if (!valid || warnings.length > 0) {
        warnings.forEach((w) => this.warn(w));
      }
    }

    this.refreshSession(this.sessionId);

    return {
      eventId: generateEventId(),
      eventName,
      eventType,
      timestamp: Date.now(),
      deviceId: this.deviceId,
      sessionId: this.sessionId,
      userId: this.userId,
      platform: 'web',
      appId: this.config.appId,
      appVersion: this.config.appVersion,
      sdkVersion: SDK_VERSION,
      pageUrl: window.location.href,
      pageTitle: document.title,
      referrer: document.referrer,
      properties: {
        ...this.userProperties,
        ...properties,
      },
    };
  }

  private trackEvent(
    eventName: string,
    eventType: EventType,
    properties: Record<string, unknown> = {}
  ): void {
    const event = this.createEvent(eventName, eventType, properties);
    this.transport.enqueue(event);
    this.log('Event tracked', event);

    if (this.transport.getQueueLength() >= this.config.batchSize) {
      this.flush();
    }
  }

  // Public API

  pageView(properties: Record<string, unknown> = {}): void {
    this.trackEvent('page_view', 'page_view', properties);
  }

  private trackPageView(data: {
    url: string;
    title: string;
    referrer: string;
  }): void {
    this.trackEvent('page_view', 'page_view', data);
  }

  click(eventName: string, properties: Record<string, unknown> = {}): void {
    this.trackEvent(eventName, 'click', properties);
  }

  expose(
    eventName: string,
    items: Record<string, unknown> | Record<string, unknown>[]
  ): void {
    const itemsArray = Array.isArray(items) ? items : [items];
    for (const item of itemsArray) {
      this.trackEvent(eventName, 'expose', item);
    }
  }

  track(eventName: string, properties: Record<string, unknown> = {}): void {
    this.trackEvent(eventName, 'custom', properties);
  }

  private trackDuration(url: string, duration: number): void {
    this.trackEvent('page_duration', 'duration', { url, duration });
  }

  private trackPerformance(data: Record<string, unknown>): void {
    this.trackEvent('performance', 'performance', data);
  }

  async flush(): Promise<void> {
    try {
      await this.transport.flush();
      this.log('Events flushed');
    } catch (error) {
      this.warn('Failed to flush events', error);
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.autoTracker.stop();
    this.flush();
  }
}
```

**Step 7: 创建 index.ts - 导出**

```typescript
// packages/sdk-web/src/index.ts

export { BuriedPoint } from './tracker';
export { Transport } from './transport';
export { storage, createStorage, type StorageAdapter } from './storage';
export { AutoTracker } from './auto-track';

// Re-export types from core
export type {
  TrackEvent,
  TrackerConfig,
  UserInfo,
  EventType,
  Platform,
  SchemaConfig,
  EventSchema,
  PropertySchema,
} from '@buried-point/core';
```

**Step 8: 创建测试文件**

```typescript
// packages/sdk-web/src/__tests__/tracker.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BuriedPoint } from '../tracker';

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  } as Response)
);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock window
Object.defineProperty(global, 'window', {
  value: {
    location: { href: 'http://localhost:3000/test' },
    addEventListener: vi.fn(),
  },
});

Object.defineProperty(global, 'document', {
  value: {
    title: 'Test Page',
    referrer: 'http://localhost:3000/',
    readyState: 'complete',
    visibilityState: 'visible',
    addEventListener: vi.fn(),
  },
});

Object.defineProperty(global, 'history', {
  value: {
    pushState: vi.fn(),
    replaceState: vi.fn(),
  },
});

Object.defineProperty(global, 'performance', {
  value: {
    getEntriesByType: () => [],
  },
});

describe('BuriedPoint', () => {
  let tracker: BuriedPoint;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();

    tracker = new BuriedPoint({
      serverUrl: 'http://localhost:3000/track',
      appId: 'test-app',
      appVersion: '1.0.0',
      debug: false,
      flushInterval: 60000, // Long interval to control flushing manually
    });
  });

  afterEach(() => {
    tracker.destroy();
  });

  it('should create tracker with correct config', () => {
    expect(tracker).toBeDefined();
  });

  it('should track click event', async () => {
    tracker.click('button_click', { button_id: 'submit' });
    await tracker.flush();

    expect(fetch).toHaveBeenCalled();
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.events).toHaveLength(2); // page_view (auto) + click
    expect(body.events[1].eventName).toBe('button_click');
    expect(body.events[1].eventType).toBe('click');
    expect(body.events[1].properties.button_id).toBe('submit');
  });

  it('should track expose events', async () => {
    tracker.expose('product_expose', [
      { product_id: 'p001', position: 0 },
      { product_id: 'p002', position: 1 },
    ]);
    await tracker.flush();

    expect(fetch).toHaveBeenCalled();
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    // page_view (auto) + 2 expose events
    expect(body.events.length).toBeGreaterThanOrEqual(2);
  });

  it('should set user info', async () => {
    tracker.setUser({ userId: 'user_123', deviceId: 'ignored', name: 'Test' });
    tracker.track('custom_event', {});
    await tracker.flush();

    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    const customEvent = body.events.find(
      (e: { eventName: string }) => e.eventName === 'custom_event'
    );

    expect(customEvent.userId).toBe('user_123');
    expect(customEvent.properties.name).toBe('Test');
  });

  it('should validate events against schema', () => {
    const trackerWithSchema = new BuriedPoint({
      serverUrl: 'http://localhost:3000/track',
      appId: 'test-app',
      appVersion: '1.0.0',
      debug: true,
      schema: {
        version: '1.0',
        events: [
          {
            name: 'button_click',
            type: 'click',
            properties: [
              { name: 'button_id', type: 'string', required: true },
            ],
          },
        ],
      },
    });

    const warnSpy = vi.spyOn(console, 'warn');

    // This should trigger a warning for missing required property
    trackerWithSchema.click('button_click', {});

    expect(warnSpy).toHaveBeenCalled();
    trackerWithSchema.destroy();
  });
});
```

**Step 9: 创建 vitest 配置**

```typescript
// packages/sdk-web/vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

**Step 10: 安装依赖并测试**

Run: `cd packages/sdk-web && pnpm install && pnpm test`
Expected: 所有测试通过

**Step 11: 构建 sdk-web 包**

Run: `pnpm build`
Expected: 成功生成 dist 目录

**Step 12: Commit**

```bash
git add .
git commit -m "feat(sdk-web): add web SDK with auto-tracking and schema validation"
```

---

## Task 4: 实现 @buried-point/server 包

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/src/index.ts`
- Create: `packages/server/src/server.ts`
- Create: `packages/server/src/database.ts`
- Create: `packages/server/src/routes/track.ts`
- Create: `packages/server/src/routes/api.ts`
- Create: `packages/server/src/__tests__/server.test.ts`

**Step 1: 创建 server package.json**

```json
{
  "name": "@buried-point/server",
  "version": "0.1.0",
  "description": "Server for buried-point analytics",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "tsx": "^4.7.0",
    "vitest": "^1.6.0",
    "@types/better-sqlite3": "^7.6.0"
  },
  "dependencies": {
    "@buried-point/core": "workspace:*",
    "fastify": "^4.26.0",
    "@fastify/cors": "^9.0.0",
    "better-sqlite3": "^9.4.0"
  }
}
```

**Step 2: 创建 server tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: 创建 database.ts - 数据库层**

```typescript
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
    const stmt = this.db.prepare(`
      INSERT INTO users (device_id, user_id, first_seen, last_seen)
      VALUES (@deviceId, @userId, @timestamp, @timestamp)
      ON CONFLICT(device_id) DO UPDATE SET
        user_id = COALESCE(@userId, user_id),
        last_seen = @timestamp,
        session_count = session_count + 1
    `);

    stmt.run({
      deviceId: event.deviceId,
      userId: event.userId ?? null,
      timestamp: event.timestamp,
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
```

**Step 4: 创建 routes/track.ts - 埋点接收路由**

```typescript
// packages/server/src/routes/track.ts

import type { FastifyInstance } from 'fastify';
import { batchPayloadSchema, validateEvent } from '@buried-point/core';
import type { TrackEvent, BatchPayload } from '@buried-point/core';
import type { TrackDatabase } from '../database';

export function registerTrackRoutes(
  app: FastifyInstance,
  db: TrackDatabase
): void {
  // Single event
  app.post('/track', async (request, reply) => {
    const event = request.body as TrackEvent;

    if (!validateEvent(event)) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid event format',
      });
    }

    try {
      const eventWithServerTime = {
        ...event,
        serverTime: Date.now(),
      };
      db.insertEvent(eventWithServerTime);

      return {
        success: true,
        eventIds: [event.eventId],
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to save event',
      });
    }
  });

  // Batch events
  app.post('/track/batch', async (request, reply) => {
    const payload = request.body as BatchPayload;
    const parseResult = batchPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid batch payload',
        errors: parseResult.error.errors,
      });
    }

    try {
      const serverTime = Date.now();
      const eventsWithServerTime = payload.events.map((e) => ({
        ...e,
        serverTime,
      }));
      db.insertEvents(eventsWithServerTime);

      return {
        success: true,
        eventIds: payload.events.map((e) => e.eventId),
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to save events',
      });
    }
  });
}
```

**Step 5: 创建 routes/api.ts - 查询 API 路由**

```typescript
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
```

**Step 6: 创建 server.ts - 服务器主入口**

```typescript
// packages/server/src/server.ts

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { TrackDatabase } from './database';
import { registerTrackRoutes } from './routes/track';
import { registerApiRoutes } from './routes/api';

export interface ServerConfig {
  port?: number;
  host?: string;
  database?: string;
  cors?: string[];
  logger?: boolean;
}

export interface TrackServer {
  app: FastifyInstance;
  db: TrackDatabase;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export function createServer(config: ServerConfig = {}): TrackServer {
  const {
    port = 3000,
    host = '0.0.0.0',
    database = './data/track.db',
    cors: corsOrigins = ['*'],
    logger = true,
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
  registerApiRoutes(app, db);

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
```

**Step 7: 创建 index.ts - 导出**

```typescript
// packages/server/src/index.ts

export { createServer, type ServerConfig, type TrackServer } from './server';
export { TrackDatabase, type DatabaseConfig, type QueryOptions } from './database';
```

**Step 8: 创建测试文件**

```typescript
// packages/server/src/__tests__/server.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type TrackServer } from '../server';
import { generateEventId, generateDeviceId, generateSessionId } from '@buried-point/core';
import fs from 'fs';
import path from 'path';

describe('TrackServer', () => {
  let server: TrackServer;
  const testDbPath = path.join(__dirname, 'test.db');

  beforeAll(async () => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    server = createServer({
      port: 3001,
      database: testDbPath,
      logger: false,
    });

    await server.app.ready();
  });

  afterAll(async () => {
    await server.stop();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should handle health check', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
  });

  it('should track single event', async () => {
    const event = {
      eventId: generateEventId(),
      eventName: 'test_event',
      eventType: 'custom',
      timestamp: Date.now(),
      deviceId: generateDeviceId(),
      sessionId: generateSessionId(),
      platform: 'web',
      appId: 'test-app',
      appVersion: '1.0.0',
      sdkVersion: '0.1.0',
      properties: { key: 'value' },
    };

    const response = await server.app.inject({
      method: 'POST',
      url: '/track',
      payload: event,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.eventIds).toContain(event.eventId);
  });

  it('should track batch events', async () => {
    const events = [
      {
        eventId: generateEventId(),
        eventName: 'batch_event_1',
        eventType: 'click',
        timestamp: Date.now(),
        deviceId: generateDeviceId(),
        sessionId: generateSessionId(),
        platform: 'web',
        appId: 'test-app',
        appVersion: '1.0.0',
        sdkVersion: '0.1.0',
        properties: {},
      },
      {
        eventId: generateEventId(),
        eventName: 'batch_event_2',
        eventType: 'click',
        timestamp: Date.now(),
        deviceId: generateDeviceId(),
        sessionId: generateSessionId(),
        platform: 'web',
        appId: 'test-app',
        appVersion: '1.0.0',
        sdkVersion: '0.1.0',
        properties: {},
      },
    ];

    const response = await server.app.inject({
      method: 'POST',
      url: '/track/batch',
      payload: { events, sentAt: Date.now() },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.eventIds).toHaveLength(2);
  });

  it('should query events', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/events?limit=10',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.events).toBeDefined();
    expect(Array.isArray(body.events)).toBe(true);
  });

  it('should get overview stats', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/stats/overview',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.today).toBeDefined();
    expect(body.daily).toBeDefined();
  });

  it('should reject invalid event', async () => {
    const response = await server.app.inject({
      method: 'POST',
      url: '/track',
      payload: { invalid: 'event' },
    });

    expect(response.statusCode).toBe(400);
  });
});
```

**Step 9: 安装依赖并测试**

Run: `cd packages/server && pnpm install && pnpm test`
Expected: 所有测试通过

**Step 10: 构建 server 包**

Run: `pnpm build`
Expected: 成功生成 dist 目录

**Step 11: Commit**

```bash
git add .
git commit -m "feat(server): add Fastify server with SQLite database"
```

---

## Task 5: 实现 @buried-point/cli 包

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/serve.ts`
- Create: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/src/commands/docs.ts`

**Step 1: 创建 cli package.json**

```json
{
  "name": "@buried-point/cli",
  "version": "0.1.0",
  "description": "CLI for buried-point analytics",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "bp": "./dist/index.js",
    "buried-point": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs --dts",
    "dev": "tsx src/index.ts",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "tsx": "^4.7.0"
  },
  "dependencies": {
    "@buried-point/server": "workspace:*",
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "inquirer": "^9.2.0",
    "yaml": "^2.4.0",
    "fs-extra": "^11.2.0"
  }
}
```

**Step 2: 创建 cli tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: 创建 commands/serve.ts**

```typescript
// packages/cli/src/commands/serve.ts

import { createServer } from '@buried-point/server';
import fs from 'fs';
import path from 'path';

export interface ServeOptions {
  port: number;
  host: string;
  database: string;
}

export async function serve(options: ServeOptions): Promise<void> {
  const { port, host, database } = options;

  // Ensure data directory exists
  const dataDir = path.dirname(database);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log(`Starting server...`);
  console.log(`  Port: ${port}`);
  console.log(`  Host: ${host}`);
  console.log(`  Database: ${database}`);

  const server = createServer({
    port,
    host,
    database,
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
```

**Step 4: 创建 commands/init.ts**

```typescript
// packages/cli/src/commands/init.ts

import fs from 'fs';
import path from 'path';

const SCHEMA_TEMPLATE = `# Buried Point Schema Definition
# This file defines the events that can be tracked in your application

version: "1.0"

events:
  # Page view event (automatically tracked)
  - name: page_view
    description: Page view event
    type: page_view
    module: Global
    properties:
      - name: url
        type: string
        required: true
        description: Page URL
      - name: title
        type: string
        required: false
        description: Page title

  # Example: Button click event
  - name: button_click
    description: Button click event
    type: click
    module: Common
    owner: Developer
    properties:
      - name: button_id
        type: string
        required: true
        description: Button unique identifier
      - name: button_text
        type: string
        required: false
        description: Button text content

  # Example: Product exposure event
  - name: product_expose
    description: Product exposure in list
    type: expose
    module: Product
    properties:
      - name: product_id
        type: string
        required: true
        description: Product ID
      - name: position
        type: number
        required: false
        description: Position in list

  # Add more events below...
`;

const CONFIG_TEMPLATE = `{
  "serverUrl": "http://localhost:3000/track",
  "appId": "my-app",
  "appVersion": "1.0.0",
  "debug": true,
  "batchSize": 10,
  "flushInterval": 5000
}
`;

export async function init(dir: string = '.'): Promise<void> {
  const targetDir = path.resolve(dir);

  console.log(`Initializing buried-point in ${targetDir}...`);

  // Create schema file
  const schemaPath = path.join(targetDir, 'track-schema.yaml');
  if (!fs.existsSync(schemaPath)) {
    fs.writeFileSync(schemaPath, SCHEMA_TEMPLATE);
    console.log(`  Created: track-schema.yaml`);
  } else {
    console.log(`  Skipped: track-schema.yaml (already exists)`);
  }

  // Create config file
  const configPath = path.join(targetDir, 'track-config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, CONFIG_TEMPLATE);
    console.log(`  Created: track-config.json`);
  } else {
    console.log(`  Skipped: track-config.json (already exists)`);
  }

  // Create data directory
  const dataDir = path.join(targetDir, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`  Created: data/`);
  }

  console.log(`\nDone! Next steps:`);
  console.log(`  1. Edit track-schema.yaml to define your events`);
  console.log(`  2. Run: bp serve`);
  console.log(`  3. Integrate SDK in your application`);
}
```

**Step 5: 创建 commands/docs.ts**

```typescript
// packages/cli/src/commands/docs.ts

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

interface PropertySchema {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

interface EventSchema {
  name: string;
  description?: string;
  type: string;
  module?: string;
  owner?: string;
  properties: PropertySchema[];
}

interface SchemaConfig {
  version: string;
  events: EventSchema[];
}

export async function generateDocs(
  schemaPath: string,
  outputPath: string
): Promise<void> {
  // Read schema file
  if (!fs.existsSync(schemaPath)) {
    console.error(`Schema file not found: ${schemaPath}`);
    process.exit(1);
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const schema = yaml.parse(schemaContent) as SchemaConfig;

  // Generate markdown
  let markdown = `# 埋点文档\n\n`;
  markdown += `> 自动生成于 ${new Date().toLocaleString()}\n\n`;
  markdown += `Schema 版本: ${schema.version}\n\n`;

  // Group events by module
  const eventsByModule = new Map<string, EventSchema[]>();
  for (const event of schema.events) {
    const module = event.module ?? 'Other';
    if (!eventsByModule.has(module)) {
      eventsByModule.set(module, []);
    }
    eventsByModule.get(module)!.push(event);
  }

  // Table of contents
  markdown += `## 目录\n\n`;
  for (const [module, events] of eventsByModule) {
    markdown += `- [${module}](#${module.toLowerCase().replace(/\s+/g, '-')})\n`;
    for (const event of events) {
      markdown += `  - [${event.name}](#${event.name.toLowerCase().replace(/_/g, '-')})\n`;
    }
  }
  markdown += `\n---\n\n`;

  // Event details
  for (const [module, events] of eventsByModule) {
    markdown += `## ${module}\n\n`;

    for (const event of events) {
      markdown += `### ${event.name}\n\n`;

      if (event.description) {
        markdown += `${event.description}\n\n`;
      }

      markdown += `| 属性 | 值 |\n`;
      markdown += `|------|----|\n`;
      markdown += `| 事件类型 | \`${event.type}\` |\n`;
      if (event.module) {
        markdown += `| 所属模块 | ${event.module} |\n`;
      }
      if (event.owner) {
        markdown += `| 负责人 | ${event.owner} |\n`;
      }
      markdown += `\n`;

      if (event.properties.length > 0) {
        markdown += `#### 参数\n\n`;
        markdown += `| 参数名 | 类型 | 必填 | 说明 |\n`;
        markdown += `|--------|------|------|------|\n`;

        for (const prop of event.properties) {
          const required = prop.required ? '是' : '否';
          const description = prop.description ?? '-';
          markdown += `| ${prop.name} | \`${prop.type}\` | ${required} | ${description} |\n`;
        }
        markdown += `\n`;
      }

      // Example code
      markdown += `#### 示例代码\n\n`;
      markdown += `\`\`\`typescript\n`;
      markdown += `tracker.${event.type === 'click' ? 'click' : event.type === 'expose' ? 'expose' : 'track'}('${event.name}', {\n`;
      for (const prop of event.properties) {
        const exampleValue = getExampleValue(prop.type);
        markdown += `  ${prop.name}: ${exampleValue},\n`;
      }
      markdown += `});\n`;
      markdown += `\`\`\`\n\n`;

      markdown += `---\n\n`;
    }
  }

  // Write output
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, markdown);
  console.log(`Documentation generated: ${outputPath}`);
}

function getExampleValue(type: string): string {
  switch (type) {
    case 'string':
      return `'example'`;
    case 'number':
      return '123';
    case 'boolean':
      return 'true';
    case 'object':
      return '{}';
    case 'array':
      return '[]';
    default:
      return `'value'`;
  }
}
```

**Step 6: 创建 index.ts - CLI 入口**

```typescript
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
```

**Step 7: 安装依赖并构建**

Run: `cd packages/cli && pnpm install && pnpm build`
Expected: 成功生成 dist 目录

**Step 8: 测试 CLI**

Run: `node dist/index.js --help`
Expected: 显示帮助信息

**Step 9: Commit**

```bash
git add .
git commit -m "feat(cli): add CLI with init, serve, and docs commands"
```

---

## Task 6: 实现 @buried-point/dashboard 包

**Files:**
- Create: `packages/dashboard/package.json`
- Create: `packages/dashboard/tsconfig.json`
- Create: `packages/dashboard/vite.config.ts`
- Create: `packages/dashboard/tailwind.config.js`
- Create: `packages/dashboard/postcss.config.js`
- Create: `packages/dashboard/index.html`
- Create: `packages/dashboard/src/main.tsx`
- Create: `packages/dashboard/src/App.tsx`
- Create: `packages/dashboard/src/index.css`
- Create: `packages/dashboard/src/api/client.ts`
- Create: `packages/dashboard/src/components/Layout.tsx`
- Create: `packages/dashboard/src/pages/Overview.tsx`
- Create: `packages/dashboard/src/pages/Events.tsx`
- Create: `packages/dashboard/src/pages/Schema.tsx`

**Step 1: 创建 dashboard package.json**

```json
{
  "name": "@buried-point/dashboard",
  "version": "0.1.0",
  "description": "Dashboard for buried-point analytics",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "echarts": "^5.5.0",
    "echarts-for-react": "^3.0.0",
    "date-fns": "^3.6.0"
  }
}
```

**Step 2: 创建 dashboard tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 3: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 4: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/track': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

**Step 5: 创建 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Step 6: 创建 postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 7: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Buried Point Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 8: 创建 src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-100;
}
```

**Step 9: 创建 src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Step 10: 创建 src/api/client.ts**

```typescript
const API_BASE = '/api';

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

export interface TrackEvent {
  eventId: string;
  eventName: string;
  eventType: string;
  timestamp: number;
  deviceId: string;
  sessionId: string;
  platform: string;
  appId: string;
  pageUrl?: string;
  properties: Record<string, unknown>;
}

export interface OverviewData {
  today: {
    pv: number;
    uv: number;
    eventCount: number;
  };
  daily: DailyStats[];
}

export async function fetchOverview(): Promise<OverviewData> {
  const response = await fetch(`${API_BASE}/stats/overview`);
  return response.json();
}

export async function fetchEventStats(): Promise<{ stats: EventStats[] }> {
  const response = await fetch(`${API_BASE}/stats/events`);
  return response.json();
}

export async function fetchRecentEvents(
  limit = 20
): Promise<{ events: TrackEvent[] }> {
  const response = await fetch(`${API_BASE}/events/recent?limit=${limit}`);
  return response.json();
}

export async function fetchEvents(params?: {
  startDate?: string;
  endDate?: string;
  eventName?: string;
  limit?: number;
}): Promise<{ events: TrackEvent[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.eventName) searchParams.set('eventName', params.eventName);
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const response = await fetch(`${API_BASE}/events?${searchParams}`);
  return response.json();
}
```

**Step 11: 创建 src/components/Layout.tsx**

```tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: '概览', icon: '📊' },
  { path: '/events', label: '事件分析', icon: '📈' },
  { path: '/schema', label: '埋点管理', icon: '📋' },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-800">Buried Point</h1>
          <p className="text-sm text-gray-500">Analytics Dashboard</p>
        </div>

        <nav className="mt-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 ${
                  isActive ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : ''
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

**Step 12: 创建 src/pages/Overview.tsx**

```tsx
import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { fetchOverview, fetchRecentEvents, type OverviewData, type TrackEvent } from '../api/client';
import { format } from 'date-fns';

export function Overview() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [recentEvents, setRecentEvents] = useState<TrackEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [overviewData, eventsData] = await Promise.all([
          fetchOverview(),
          fetchRecentEvents(10),
        ]);
        setOverview(overviewData);
        setRecentEvents(eventsData.events);
      } catch (error) {
        console.error('Failed to load overview:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (!overview) {
    return <div className="text-center py-10">No data available</div>;
  }

  const chartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['PV', 'UV', '事件数'] },
    xAxis: {
      type: 'category',
      data: overview.daily.map((d) => d.date),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'PV',
        type: 'line',
        data: overview.daily.map((d) => d.pv),
        smooth: true,
      },
      {
        name: 'UV',
        type: 'line',
        data: overview.daily.map((d) => d.uv),
        smooth: true,
      },
      {
        name: '事件数',
        type: 'line',
        data: overview.daily.map((d) => d.eventCount),
        smooth: true,
      },
    ],
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">概览</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">今日 PV</div>
          <div className="text-3xl font-bold text-blue-600">{overview.today.pv}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">今日 UV</div>
          <div className="text-3xl font-bold text-green-600">{overview.today.uv}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">今日事件数</div>
          <div className="text-3xl font-bold text-purple-600">{overview.today.eventCount}</div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold mb-4">趋势</h3>
        <ReactECharts option={chartOption} style={{ height: 300 }} />
      </div>

      {/* Recent Events */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">最近事件</h3>
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2">时间</th>
              <th className="pb-2">事件名</th>
              <th className="pb-2">类型</th>
              <th className="pb-2">平台</th>
            </tr>
          </thead>
          <tbody>
            {recentEvents.map((event) => (
              <tr key={event.eventId} className="border-b last:border-0">
                <td className="py-2 text-sm text-gray-600">
                  {format(new Date(event.timestamp), 'HH:mm:ss')}
                </td>
                <td className="py-2 font-medium">{event.eventName}</td>
                <td className="py-2">
                  <span className="px-2 py-1 text-xs rounded bg-gray-100">
                    {event.eventType}
                  </span>
                </td>
                <td className="py-2 text-sm">{event.platform}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 13: 创建 src/pages/Events.tsx**

```tsx
import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { fetchEventStats, fetchEvents, type EventStats, type TrackEvent } from '../api/client';
import { format } from 'date-fns';

export function Events() {
  const [stats, setStats] = useState<EventStats[]>([]);
  const [events, setEvents] = useState<TrackEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, eventsData] = await Promise.all([
          fetchEventStats(),
          fetchEvents({ limit: 100 }),
        ]);
        setStats(statsData.stats);
        setEvents(eventsData.events);
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  const pieOption = {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: stats.slice(0, 10).map((s) => ({
          name: s.eventName,
          value: s.count,
        })),
      },
    ],
  };

  const filteredEvents = selectedEvent
    ? events.filter((e) => e.eventName === selectedEvent)
    : events;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">事件分析</h2>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Event Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">事件分布</h3>
          <ReactECharts option={pieOption} style={{ height: 300 }} />
        </div>

        {/* Event List */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">事件统计</h3>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">事件名</th>
                  <th className="pb-2">类型</th>
                  <th className="pb-2 text-right">次数</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat) => (
                  <tr
                    key={stat.eventName}
                    className={`border-b last:border-0 cursor-pointer hover:bg-gray-50 ${
                      selectedEvent === stat.eventName ? 'bg-blue-50' : ''
                    }`}
                    onClick={() =>
                      setSelectedEvent(
                        selectedEvent === stat.eventName ? null : stat.eventName
                      )
                    }
                  >
                    <td className="py-2 font-medium">{stat.eventName}</td>
                    <td className="py-2">
                      <span className="px-2 py-1 text-xs rounded bg-gray-100">
                        {stat.eventType}
                      </span>
                    </td>
                    <td className="py-2 text-right">{stat.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">
          事件详情
          {selectedEvent && (
            <span className="text-sm text-gray-500 ml-2">
              - 筛选: {selectedEvent}
              <button
                className="ml-2 text-blue-500"
                onClick={() => setSelectedEvent(null)}
              >
                清除
              </button>
            </span>
          )}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">时间</th>
                <th className="pb-2">事件名</th>
                <th className="pb-2">类型</th>
                <th className="pb-2">页面</th>
                <th className="pb-2">属性</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.slice(0, 50).map((event) => (
                <tr key={event.eventId} className="border-b last:border-0">
                  <td className="py-2 text-sm text-gray-600">
                    {format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td className="py-2 font-medium">{event.eventName}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 text-xs rounded bg-gray-100">
                      {event.eventType}
                    </span>
                  </td>
                  <td className="py-2 text-sm text-gray-600 max-w-xs truncate">
                    {event.pageUrl}
                  </td>
                  <td className="py-2 text-sm text-gray-600">
                    <code className="text-xs bg-gray-100 p-1 rounded">
                      {JSON.stringify(event.properties).slice(0, 50)}...
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**Step 14: 创建 src/pages/Schema.tsx**

```tsx
import React from 'react';

export function Schema() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">埋点管理</h2>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Schema 配置</h3>
        <p className="text-gray-600 mb-4">
          在项目根目录创建 <code className="bg-gray-100 px-2 py-1 rounded">track-schema.yaml</code> 文件来定义埋点规范。
        </p>

        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`version: "1.0"

events:
  - name: button_click
    description: 按钮点击事件
    type: click
    module: 首页
    owner: 张三
    properties:
      - name: button_id
        type: string
        required: true
        description: 按钮唯一标识
      - name: button_text
        type: string
        required: false
        description: 按钮文案

  - name: product_expose
    description: 商品曝光
    type: expose
    module: 商品列表
    properties:
      - name: product_id
        type: string
        required: true
      - name: position
        type: number
        description: 曝光位置索引`}</pre>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">生成文档</h3>
        <p className="text-gray-600 mb-4">
          运行以下命令生成埋点文档：
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
          <code>npx @buried-point/cli docs</code>
        </div>
      </div>
    </div>
  );
}
```

**Step 15: 创建 src/App.tsx**

```tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Overview } from './pages/Overview';
import { Events } from './pages/Events';
import { Schema } from './pages/Schema';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/events" element={<Events />} />
        <Route path="/schema" element={<Schema />} />
      </Routes>
    </Layout>
  );
}

export default App;
```

**Step 16: 安装依赖并构建**

Run: `cd packages/dashboard && pnpm install && pnpm build`
Expected: 成功生成 dist 目录

**Step 17: Commit**

```bash
git add .
git commit -m "feat(dashboard): add React dashboard with ECharts"
```

---

## Task 7: 集成测试和最终验证

**Step 1: 根目录安装所有依赖**

Run: `pnpm install`
Expected: 所有包依赖安装成功

**Step 2: 构建所有包**

Run: `pnpm build`
Expected: 所有包构建成功

**Step 3: 运行所有测试**

Run: `pnpm test`
Expected: 所有测试通过

**Step 4: 测试 CLI 初始化**

Run: `cd /tmp && mkdir bp-test && cd bp-test && node /path/to/packages/cli/dist/index.js init`
Expected: 成功创建配置文件

**Step 5: 测试服务端启动**

Run: `node packages/cli/dist/index.js serve --port 3001`
Expected: 服务成功启动

**Step 6: 测试 Dashboard 开发服务器**

Run: `cd packages/dashboard && pnpm dev`
Expected: Dashboard 成功启动在 8080 端口

**Step 7: Final Commit**

```bash
git add .
git commit -m "chore: complete integration and verification"
```

---

## Summary

完成后的包结构：

```
@buried-point/
├── core          ✅ 类型定义 + Schema 验证
├── sdk-web       ✅ 浏览器 SDK + 自动采集
├── server        ✅ Fastify + SQLite
├── dashboard     ✅ React + ECharts
└── cli           ✅ 命令行工具
```

主要功能：
- ✅ 埋点数据收集（PV、点击、曝光、停留时长、性能）
- ✅ Schema 定义与验证
- ✅ 批量上报与重试机制
- ✅ SQLite 数据存储
- ✅ REST API 查询接口
- ✅ ECharts 可视化报表
- ✅ CLI 快捷命令
