'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter
} from 'recharts';
import { motion, Variants } from 'framer-motion';

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  x: string;
  y: string;
  title: string;
  insight: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

export default function ChartRenderer({ config, data = [] }: { config: ChartConfig, data: any[] }) {
  const { type, x, y, title, insight } = config;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Properly typed animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const
      }
    }
  };

  // Safely format pie chart labels
  const formatPieLabel = ({ name, percent }: { name: string, percent?: number }) => {
    return `${name}: ${((percent || 0) * 100).toFixed(0)}%`;
  };

  // Helper to ensure y-axis data is numeric for charts
  const getNumericValue = (item: any, key: string) => {
    const value = item[key];
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    return value;
  };

  // Prepare data for charting (ensure numeric types for y-axis)
  const chartData = data.map(item => ({
    ...item,
    [y]: getNumericValue(item, y)
  }));

  // Handle empty data state
  if (!chartData || chartData.length === 0) {
    return (
      <motion.div
        initial="hidden"
        animate={isMounted ? "visible" : "hidden"}
        variants={containerVariants}
        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
      >
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
          {insight && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">
              {insight}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available for this chart
        </div>
      </motion.div>
    );
  }

  // Define the chart component based on type
  let ChartComponent;
  switch (type) {
    case 'bar':
      ChartComponent = (
        <BarChart data={chartData}>
          <XAxis dataKey={x} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={y} fill={COLORS[0]} />
        </BarChart>
      );
      break;
    case 'line':
      ChartComponent = (
        <LineChart data={chartData}>
          <XAxis dataKey={x} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={y} stroke={COLORS[1]} strokeWidth={2} />
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
            outerRadius={100}
            label={formatPieLabel}
          >
            {chartData.map((_, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      );
      break;
    case 'scatter':
      ChartComponent = (
        <ScatterChart>
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
    <motion.div
      initial="hidden"
      animate={isMounted ? "visible" : "hidden"}
      variants={containerVariants}
      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
    >
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
        {insight && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">{insight}</p>
        )}
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          {/* Render the single ChartComponent here */}
          {ChartComponent}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
