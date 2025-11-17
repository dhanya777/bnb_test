import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Report, ExtractedValue } from '../types';
import Spinner from './Spinner';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TrendsProps {
  currentUser: User;
  reports: Report[]; // All reports are passed to analyze trends
}

interface TrendDataPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
    fill: boolean;
  }[];
}

const Trends: React.FC<TrendsProps> = ({ currentUser, reports }) => {
  const [loading, setLoading] = useState<boolean>(true); // Assume loading initially until reports are processed
  const [error, setError] = useState<string | null>(null);
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [chartData, setChartData] = useState<ChartData | null>(null);

  // Function to extract and prepare trend data
  const processTrendData = useCallback((metricKey: string) => {
    if (!metricKey || reports.length === 0) {
      setChartData(null);
      return;
    }

    const dataPoints: TrendDataPoint[] = [];

    reports.forEach(report => {
      const extractedValue = report.extractedValues[metricKey];
      if (extractedValue && typeof extractedValue.value === 'number') {
        dataPoints.push({
          date: report.timestamp,
          value: extractedValue.value,
        });
      }
    });

    // Sort data points by date
    dataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setChartData({
      labels: dataPoints.map(dp => dp.date),
      datasets: [
        {
          label: metricKey.replace(/([A-Z])/g, ' $1').trim(), // Make it more readable
          data: dataPoints.map(dp => dp.value),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          tension: 0.3,
          fill: true,
        },
      ],
    });
  }, [reports]);

  useEffect(() => {
    if (reports.length > 0) {
      setLoading(false);
      // Identify all unique numeric metrics from all reports
      const metricsSet = new Set<string>();
      reports.forEach(report => {
        for (const key in report.extractedValues) {
          const value = report.extractedValues[key];
          if (value && typeof value.value === 'number') {
            metricsSet.add(key);
          }
        }
      });
      const uniqueMetrics = Array.from(metricsSet).sort();
      setAvailableMetrics(uniqueMetrics);

      if (uniqueMetrics.length > 0 && !selectedMetric) {
        setSelectedMetric(uniqueMetrics[0]); // Select the first available metric by default
      }
    } else {
      setLoading(false);
      setAvailableMetrics([]);
      setSelectedMetric('');
    }
  }, [reports, selectedMetric]);

  useEffect(() => {
    processTrendData(selectedMetric);
  }, [selectedMetric, processTrendData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
        <p className="ml-4 text-gray-700">Analyzing your health trends...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-2xl mx-auto my-8" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline ml-2">{error}</span>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto my-8 text-center">
        <h2 className="text-3xl font-semibold text-dark-green mb-4">No Reports for Trend Analysis</h2>
        <p className="text-gray-600 mb-6">
          Upload some medical reports to start seeing your health trends over time.
        </p>
      </div>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: selectedMetric.replace(/([A-Z])/g, ' $1').trim() + ' Trend Over Time',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Value',
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-4xl mx-auto my-8">
      <h2 className="text-3xl font-semibold text-dark-green mb-6">Health Trend Analysis</h2>
      <p className="text-gray-600 mb-6">
        Visualize how your key lab values and metrics have changed over time.
      </p>

      <div className="mb-6 flex items-center space-x-4">
        <label htmlFor="metric-select" className="text-lg font-medium text-gray-700">Select Metric:</label>
        <select
          id="metric-select"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          disabled={availableMetrics.length === 0}
        >
          {availableMetrics.length === 0 ? (
            <option value="">No trendable metrics found</option>
          ) : (
            availableMetrics.map((metric) => (
              <option key={metric} value={metric}>
                {metric.replace(/([A-Z])/g, ' $1').trim()}
              </option>
            ))
          )}
        </select>
      </div>

      {chartData && chartData.labels.length > 1 ? (
        <div className="relative h-96 w-full">
          <Line options={chartOptions} data={chartData} />
        </div>
      ) : (
        <div className="text-center text-gray-500 mt-8">
          {selectedMetric ? `Not enough data points for ${selectedMetric.replace(/([A-Z])/g, ' $1').trim()} to show a trend.` : 'Select a metric to view its trend.'}
        </div>
      )}
    </div>
  );
};

export default Trends;