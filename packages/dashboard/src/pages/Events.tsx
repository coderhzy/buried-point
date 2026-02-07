import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { fetchEventStats, fetchEvents, fetchAllEvents, type EventStats, type TrackEvent } from '../api/client';
import { format } from 'date-fns';
import { exportToExcel } from '../utils/export';

export function Events() {
  const [stats, setStats] = useState<EventStats[]>([]);
  const [events, setEvents] = useState<TrackEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

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

  const handleExportEvents = async () => {
    setExporting(true);
    try {
      const allEvents = await fetchAllEvents(
        selectedEvent ? { eventName: selectedEvent } : undefined
      );

      // Collect all unique property keys
      const propKeys = new Set<string>();
      allEvents.forEach((e) => {
        if (e.properties) {
          Object.keys(e.properties).forEach((k) => propKeys.add(k));
        }
      });
      const sortedPropKeys = Array.from(propKeys).sort();

      const headers = [
        '事件ID', '事件名称', '事件类型', '时间',
        '设备ID', '会话ID', '平台', '应用ID', '页面URL',
        ...sortedPropKeys.map((k) => `属性:${k}`),
      ];

      const rows = allEvents.map((e) => [
        e.eventId,
        e.eventName,
        e.eventType,
        format(new Date(e.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        e.deviceId,
        e.sessionId,
        e.platform,
        e.appId,
        e.pageUrl || '',
        ...sortedPropKeys.map((k) => {
          const val = e.properties?.[k];
          if (val === undefined || val === null) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        }),
      ]);

      const filename = selectedEvent ? `事件详情_${selectedEvent}` : '全部事件详情';
      exportToExcel(filename, headers, rows);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportStats = () => {
    const headers = ['事件名称', '事件类型', '触发次数'];
    const rows = stats.map((s) => [s.eventName, s.eventType, s.count]);
    exportToExcel('事件统计', headers, rows);
  };

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">事件分析</h2>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleExportStats}
          >
            导出统计
          </button>
          <button
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleExportEvents}
            disabled={exporting}
          >
            {exporting ? '导出中...' : selectedEvent ? `导出「${selectedEvent}」详情` : '导出全部事件详情'}
          </button>
        </div>
      </div>

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
