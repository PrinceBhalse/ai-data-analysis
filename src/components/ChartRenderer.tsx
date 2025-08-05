// src/components/ChartRenderer.tsx
'use client';

import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  x: string;
  y: string;
  title: string;
  insight: string;
}

interface ChartRendererProps {
  config: ChartConfig;
  data: Record<string, unknown>[]; // Fixed 'any' to 'unknown'
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const ChartRenderer: React.FC<ChartRendererProps> = ({ config, data }) => {
  const { type, x, y, title, insight } = config;

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No data available for this chart.</p>
      </div>
    );
  }
  
  const getNumericValue = (item: Record<string, unknown>, key: string) => { // Fixed 'any' to 'unknown'
    const value = item[key];
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    return value;
  };
  
  const chartData = data.map(item => ({
    ...item,
    [y]: getNumericValue(item, y)
  }));

  let ChartComponent;
  switch (type) {
    case 'bar':
      ChartComponent = (
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey={x} stroke="#666" />
          <YAxis stroke="#666" />
          <Tooltip />
          <Legend />
          <Bar dataKey={y} fill={COLORS[0]} />
        </BarChart>
      );
      break;
    case 'line':
      ChartComponent = (
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey={x} stroke="#666" />
          <YAxis stroke="#666" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={y} stroke={COLORS[1]} activeDot={{ r: 8 }} />
        </LineChart>
      );
      break;
    case 'pie':
      ChartComponent = (
        <PieChart>
          <Pie
            data={chartData}
            dataKey={y}
            nameKey={x}
            cx="50%"
            cy="50%"
            outerRadius={120}
            fill="#8884d8"
            label
          >
            {
              chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))
            }
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      );
      break;
    case 'scatter':
      ChartComponent = (
        <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis type="category" dataKey={x} name={x} stroke="#666" />
          <YAxis type="number" dataKey={y} name={y} stroke="#666" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          <Scatter name={title} data={chartData} fill={COLORS[2]} />
        </ScatterChart>
      );
      break;
    default:
      ChartComponent = (
        <div className="flex items-center justify-center h-full text-red-500">
          Unsupported chart type.
        </div>
      );
  }

  return (
    <div className="chart-container flex flex-col h-[400px]">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{insight}</p>
      <ResponsiveContainer width="100%" height="100%">
        {ChartComponent}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartRenderer;
