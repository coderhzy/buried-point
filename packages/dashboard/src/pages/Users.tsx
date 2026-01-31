import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { fetchRetentionStats, fetchOverview, type RetentionStats, type OverviewData } from '../api/client';
import { format, subDays } from 'date-fns';

export function Users() {
  const [retentionData, setRetentionData] = useState<RetentionStats | null>(null);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retentionDays, setRetentionDays] = useState(7);

  useEffect(() => {
    async function load() {
      try {
        const endDate = format(new Date(), 'yyyy-MM-dd');
        const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

        const [retention, overview] = await Promise.all([
          fetchRetentionStats(startDate, endDate, retentionDays),
          fetchOverview(),
        ]);
        setRetentionData(retention);
        setOverviewData(overview);
      } catch (error) {
        console.error('Failed to load user data:', error);
        // Set mock data for demonstration
        setRetentionData({
          cohorts: [
            { cohortDate: '2024-01-01', cohortSize: 100, retention: [100, 45, 30, 25, 20, 18, 15] },
            { cohortDate: '2024-01-02', cohortSize: 120, retention: [100, 50, 35, 28, 22, 19, 16] },
            { cohortDate: '2024-01-03', cohortSize: 90, retention: [100, 42, 28, 22, 18, 15, 13] },
            { cohortDate: '2024-01-04', cohortSize: 110, retention: [100, 48, 32, 26, 21, 17, 14] },
            { cohortDate: '2024-01-05', cohortSize: 95, retention: [100, 44, 29, 23, 19, 16, 0] },
            { cohortDate: '2024-01-06', cohortSize: 130, retention: [100, 52, 36, 29, 24, 0, 0] },
            { cohortDate: '2024-01-07', cohortSize: 85, retention: [100, 40, 27, 21, 0, 0, 0] },
          ],
          days: retentionDays,
        });
        setOverviewData({
          today: { pv: 1500, uv: 350, eventCount: 4200 },
          daily: [
            { date: '2024-01-01', pv: 1200, uv: 280, eventCount: 3500 },
            { date: '2024-01-02', pv: 1350, uv: 310, eventCount: 3800 },
            { date: '2024-01-03', pv: 1100, uv: 260, eventCount: 3200 },
            { date: '2024-01-04', pv: 1400, uv: 320, eventCount: 4000 },
            { date: '2024-01-05', pv: 1300, uv: 295, eventCount: 3700 },
            { date: '2024-01-06', pv: 1450, uv: 340, eventCount: 4100 },
            { date: '2024-01-07', pv: 1500, uv: 350, eventCount: 4200 },
          ],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [retentionDays]);

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  // Active Users Chart
  const activeUsersOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['DAU (Daily Active Users)'] },
    xAxis: {
      type: 'category',
      data: overviewData?.daily.map((d) => d.date) || [],
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'DAU (Daily Active Users)',
        type: 'line',
        data: overviewData?.daily.map((d) => d.uv) || [],
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ],
          },
        },
        lineStyle: { color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
      },
    ],
  };

  // User Growth Trend Chart
  const growthData = overviewData?.daily.map((d, i, arr) => {
    if (i === 0) return 0;
    const prev = arr[i - 1].uv;
    return prev > 0 ? Math.round(((d.uv - prev) / prev) * 100) : 0;
  }) || [];

  const growthTrendOption = {
    tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
    xAxis: {
      type: 'category',
      data: overviewData?.daily.map((d) => d.date) || [],
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        name: 'Growth Rate',
        type: 'bar',
        data: growthData,
        itemStyle: {
          color: (params: { value: number }) => (params.value >= 0 ? '#22c55e' : '#ef4444'),
        },
      },
    ],
  };

  // Retention color helper
  const getRetentionColor = (value: number) => {
    if (value === 0) return 'bg-gray-100';
    if (value >= 50) return 'bg-green-500 text-white';
    if (value >= 30) return 'bg-green-300';
    if (value >= 20) return 'bg-yellow-300';
    if (value >= 10) return 'bg-orange-300';
    return 'bg-red-300';
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Users</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Today's Active Users</div>
          <div className="text-3xl font-bold text-blue-600">{overviewData?.today.uv || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">7-Day Avg DAU</div>
          <div className="text-3xl font-bold text-green-600">
            {Math.round((overviewData?.daily.reduce((sum, d) => sum + d.uv, 0) || 0) / 7)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Day 1 Retention</div>
          <div className="text-3xl font-bold text-purple-600">
            {retentionData?.cohorts[0]?.retention[1] || 0}%
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Day 7 Retention</div>
          <div className="text-3xl font-bold text-orange-600">
            {retentionData?.cohorts[0]?.retention[6] || 0}%
          </div>
        </div>
      </div>

      {/* Retention Matrix */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">User Retention Matrix</h3>
          <select
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            className="border rounded px-3 py-1"
          >
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 pr-4">Cohort Date</th>
                <th className="pb-2 pr-4">Users</th>
                {Array.from({ length: retentionDays }, (_, i) => (
                  <th key={i} className="pb-2 px-2 text-center">
                    Day {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {retentionData?.cohorts.map((cohort) => (
                <tr key={cohort.cohortDate} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{cohort.cohortDate}</td>
                  <td className="py-2 pr-4 text-gray-600">{cohort.cohortSize}</td>
                  {cohort.retention.map((rate, i) => (
                    <td key={i} className="py-2 px-2">
                      <div
                        className={`text-center py-1 px-2 rounded ${getRetentionColor(rate)}`}
                      >
                        {rate > 0 ? `${rate}%` : '-'}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Active Users Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Active Users</h3>
          <ReactECharts option={activeUsersOption} style={{ height: 300 }} />
        </div>

        {/* User Growth Trend */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">User Growth Trend</h3>
          <ReactECharts option={growthTrendOption} style={{ height: 300 }} />
        </div>
      </div>
    </div>
  );
}
