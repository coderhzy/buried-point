// When deployed behind a proxy at /track-dashboard, API calls need the same prefix
// BASE_URL is set in vite.config.ts
const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') + '/api' || '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithErrorHandling<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new ApiError(
      `HTTP error ${response.status}: ${response.statusText}`,
      response.status,
      response.statusText
    );
  }

  return response.json();
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
  return fetchWithErrorHandling<OverviewData>(`${API_BASE}/stats/overview`);
}

export async function fetchEventStats(): Promise<{ stats: EventStats[] }> {
  return fetchWithErrorHandling<{ stats: EventStats[] }>(`${API_BASE}/stats/events`);
}

export async function fetchRecentEvents(
  limit = 20
): Promise<{ events: TrackEvent[] }> {
  return fetchWithErrorHandling<{ events: TrackEvent[] }>(`${API_BASE}/events/recent?limit=${limit}`);
}

export async function fetchEvents(params?: {
  startDate?: string;
  endDate?: string;
  eventName?: string;
  limit?: number;
  offset?: number;
}): Promise<{ events: TrackEvent[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.eventName) searchParams.set('eventName', params.eventName);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  return fetchWithErrorHandling<{ events: TrackEvent[]; total: number }>(`${API_BASE}/events?${searchParams}`);
}

export async function fetchAllEvents(params?: {
  startDate?: string;
  endDate?: string;
  eventName?: string;
}): Promise<TrackEvent[]> {
  const pageSize = 1000;
  let allEvents: TrackEvent[] = [];
  let offset = 0;

  while (true) {
    const { events } = await fetchEvents({
      ...params,
      limit: pageSize,
      offset,
    });
    allEvents = allEvents.concat(events);
    if (events.length < pageSize) break;
    offset += pageSize;
  }

  return allEvents;
}

export interface FunnelStep {
  step: string;
  count: number;
  conversionRate: number;
}

export interface FunnelStats {
  steps: FunnelStep[];
  overallConversionRate: number;
}

export async function fetchFunnelStats(
  steps: string[],
  startDate?: string,
  endDate?: string
): Promise<FunnelStats> {
  const searchParams = new URLSearchParams();
  steps.forEach((step) => searchParams.append('steps', step));
  if (startDate) searchParams.set('startDate', startDate);
  if (endDate) searchParams.set('endDate', endDate);

  return fetchWithErrorHandling<FunnelStats>(`${API_BASE}/stats/funnel?${searchParams}`);
}

export interface RetentionCohort {
  cohortDate: string;
  cohortSize: number;
  retention: number[];
}

export interface RetentionStats {
  cohorts: RetentionCohort[];
  days: number;
}

export async function fetchRetentionStats(
  startDate?: string,
  endDate?: string,
  days?: number
): Promise<RetentionStats> {
  const searchParams = new URLSearchParams();
  if (startDate) searchParams.set('startDate', startDate);
  if (endDate) searchParams.set('endDate', endDate);
  if (days) searchParams.set('days', String(days));

  return fetchWithErrorHandling<RetentionStats>(`${API_BASE}/stats/retention?${searchParams}`);
}
