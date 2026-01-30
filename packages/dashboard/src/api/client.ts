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
