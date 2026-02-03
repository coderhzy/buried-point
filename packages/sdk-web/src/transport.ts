// packages/sdk-web/src/transport.ts

import type { TrackEvent, BatchPayload, ServerResponse } from 'buried-point-core';

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
