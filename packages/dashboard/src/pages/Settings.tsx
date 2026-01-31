import { useState } from 'react';
import { format, subDays } from 'date-fns';

const timezones = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

export function Settings() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timezone, setTimezone] = useState('UTC');
  const [exportLoading, setExportLoading] = useState<'csv' | 'json' | null>(null);

  const handleExport = async (formatType: 'csv' | 'json') => {
    setExportLoading(formatType);

    try {
      // Simulate export delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create mock data for export
      const mockData = [
        { date: '2024-01-01', eventName: 'page_view', count: 1500 },
        { date: '2024-01-01', eventName: 'button_click', count: 350 },
        { date: '2024-01-02', eventName: 'page_view', count: 1650 },
        { date: '2024-01-02', eventName: 'button_click', count: 420 },
        { date: '2024-01-03', eventName: 'page_view', count: 1400 },
        { date: '2024-01-03', eventName: 'button_click', count: 310 },
      ];

      let content: string;
      let mimeType: string;
      let filename: string;

      if (formatType === 'csv') {
        const headers = Object.keys(mockData[0]).join(',');
        const rows = mockData.map((row) => Object.values(row).join(','));
        content = [headers, ...rows].join('\n');
        mimeType = 'text/csv';
        filename = `analytics_export_${startDate}_${endDate}.csv`;
      } else {
        content = JSON.stringify(mockData, null, 2);
        mimeType = 'application/json';
        filename = `analytics_export_${startDate}_${endDate}.json`;
      }

      // Create and trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      {/* Date Range Selector */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Date Range</h3>
        <p className="text-gray-500 text-sm mb-4">
          Select the date range for data analysis and export.
        </p>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-3 py-2 w-48"
            />
          </div>
          <div className="pt-6">to</div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-3 py-2 w-48"
            />
          </div>
          <div className="pt-6">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => {
                setStartDate(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
                setEndDate(format(new Date(), 'yyyy-MM-dd'));
              }}
            >
              Last 7 Days
            </button>
          </div>
          <div className="pt-6">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => {
                setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
                setEndDate(format(new Date(), 'yyyy-MM-dd'));
              }}
            >
              Last 30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Timezone Configuration */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Timezone Configuration</h3>
        <p className="text-gray-500 text-sm mb-4">
          Select your preferred timezone for displaying dates and times in the dashboard.
        </p>
        <div className="max-w-md">
          <label className="block text-sm text-gray-600 mb-1">Display Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-2">
            Note: This setting affects how dates and times are displayed in the dashboard.
            Data is stored in UTC.
          </p>
        </div>
        <div className="mt-4">
          <button
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
            onClick={() => {
              const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
              const found = timezones.find((tz) => tz.value === detected);
              if (found) {
                setTimezone(found.value);
              } else {
                alert(`Your timezone (${detected}) is not in the list. Please select manually.`);
              }
            }}
          >
            Detect My Timezone
          </button>
        </div>
      </div>

      {/* Data Export */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Data Export</h3>
        <p className="text-gray-500 text-sm mb-4">
          Export your analytics data for the selected date range ({startDate} to {endDate}).
        </p>
        <div className="flex gap-4">
          <button
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
              exportLoading === 'csv'
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            onClick={() => handleExport('csv')}
            disabled={exportLoading !== null}
          >
            {exportLoading === 'csv' ? (
              <>
                <span className="animate-spin">&#9696;</span>
                Exporting...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download CSV
              </>
            )}
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
              exportLoading === 'json'
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            onClick={() => handleExport('json')}
            disabled={exportLoading !== null}
          >
            {exportLoading === 'json' ? (
              <>
                <span className="animate-spin">&#9696;</span>
                Exporting...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download JSON
              </>
            )}
          </button>
        </div>
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">Export includes:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>- Event data (page views, clicks, custom events)</li>
            <li>- User activity metrics (DAU, MAU)</li>
            <li>- Session information</li>
            <li>- Device and browser statistics</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
