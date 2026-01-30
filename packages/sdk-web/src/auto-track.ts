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
