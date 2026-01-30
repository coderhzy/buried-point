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
  private abortController: AbortController | null = null;
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;

  constructor(callbacks: AutoTrackCallbacks) {
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.abortController = new AbortController();

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

    // Remove all event listeners
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Restore original history methods
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
      this.originalPushState = null;
    }
    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
      this.originalReplaceState = null;
    }
  }

  private trackPageView(): void {
    this.callbacks.onPageView({
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
    });
  }

  private setupRouteListener(): void {
    const signal = this.abortController?.signal;

    // Handle popstate (back/forward)
    window.addEventListener('popstate', () => {
      if (!this.enabled) return;
      this.handleRouteChange();
    }, { signal });

    // Intercept pushState and replaceState
    this.originalPushState = history.pushState;
    this.originalReplaceState = history.replaceState;

    const self = this;

    history.pushState = function(...args) {
      self.originalPushState!.apply(history, args);
      if (self.enabled) self.handleRouteChange();
    };

    history.replaceState = function(...args) {
      self.originalReplaceState!.apply(history, args);
      if (self.enabled) self.handleRouteChange();
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
    const signal = this.abortController?.signal;

    window.addEventListener('beforeunload', () => {
      if (!this.enabled) return;

      const duration = Date.now() - this.pageStartTime;
      this.callbacks.onDuration({
        url: this.currentUrl,
        duration,
      });
    }, { signal });

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
    }, { signal });
  }

  private collectPerformance(): void {
    const signal = this.abortController?.signal;

    // Wait for page load
    if (document.readyState === 'complete') {
      this.reportPerformance();
    } else {
      window.addEventListener('load', () => {
        // Delay to ensure metrics are available
        setTimeout(() => this.reportPerformance(), 1000);
      }, { signal });
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
