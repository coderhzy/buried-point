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
