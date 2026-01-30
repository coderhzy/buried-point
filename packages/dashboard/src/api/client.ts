const API_BASE = '/api';

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
}): Promise<{ events: TrackEvent[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.eventName) searchParams.set('eventName', params.eventName);
  if (params?.limit) searchParams.set('limit', String(params.limit));

  return fetchWithErrorHandling<{ events: TrackEvent[]; total: number }>(`${API_BASE}/events?${searchParams}`);
}
