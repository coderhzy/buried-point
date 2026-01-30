import { useEffect, useState } from 'react';
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
