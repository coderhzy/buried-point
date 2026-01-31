// packages/sdk-miniapp/src/transport.ts

import type { TrackEvent, BatchPayload, ServerResponse } from '@buried-point/core';
import type { MiniAppPlatform } from './types';

export interface TransportConfig {
  serverUrl: string;
  timeout?: number;
  retries?: number;
  platform: MiniAppPlatform;
}

export class Transport {
  private config: Required<TransportConfig>;
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

    for (let i = 0; i < this.config.retries; i++) {
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

  private doSend(payload: BatchPayload): Promise<ServerResponse> {
    return new Promise((resolve, reject) => {
      const requestOptions = {
        url: this.config.serverUrl,
        method: 'POST' as const,
        data: payload,
        timeout: this.config.timeout,
        success: (res: { statusCode?: number; status?: number; data: unknown }) => {
          const statusCode = res.statusCode ?? res.status ?? 0;
          if (statusCode >= 200 && statusCode < 300) {
            resolve(res.data as ServerResponse);
          } else {
            reject(new Error(`HTTP error: ${statusCode}`));
          }
        },
        fail: (err: { errMsg?: string; error?: string }) => {
          reject(new Error(err.errMsg ?? err.error ?? 'Request failed'));
        },
      };

      switch (this.config.platform) {
        case 'wechat':
          this.sendWechat(requestOptions);
          break;
        case 'alipay':
          this.sendAlipay(requestOptions);
          break;
        case 'douyin':
          this.sendDouyin(requestOptions);
          break;
        default:
          reject(new Error('Unsupported platform'));
      }
    });
  }

  private sendWechat(options: {
    url: string;
    method: 'POST';
    data: unknown;
    timeout: number;
    success: (res: { statusCode?: number; status?: number; data: unknown }) => void;
    fail: (err: { errMsg?: string; error?: string }) => void;
  }): void {
    wx.request({
      url: options.url,
      method: options.method,
      data: options.data,
      header: {
        'Content-Type': 'application/json',
      },
      timeout: options.timeout,
      success: (res) => options.success({ statusCode: res.statusCode, data: res.data }),
      fail: (err) => options.fail({ errMsg: err.errMsg }),
    });
  }

  private sendAlipay(options: {
    url: string;
    method: 'POST';
    data: unknown;
    timeout: number;
    success: (res: { statusCode?: number; status?: number; data: unknown }) => void;
    fail: (err: { errMsg?: string; error?: string }) => void;
  }): void {
    my.request({
      url: options.url,
      method: options.method,
      data: options.data,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: options.timeout,
      success: (res) => options.success({ status: res.status, data: res.data }),
      fail: (err) => options.fail({ error: err.error }),
    });
  }

  private sendDouyin(options: {
    url: string;
    method: 'POST';
    data: unknown;
    timeout: number;
    success: (res: { statusCode?: number; status?: number; data: unknown }) => void;
    fail: (err: { errMsg?: string; error?: string }) => void;
  }): void {
    tt.request({
      url: options.url,
      method: options.method,
      data: options.data,
      header: {
        'Content-Type': 'application/json',
      },
      timeout: options.timeout,
      success: (res) => options.success({ statusCode: res.statusCode, data: res.data }),
      fail: (err) => options.fail({ errMsg: err.errMsg }),
    });
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
