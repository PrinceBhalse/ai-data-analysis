'use client';

import React from 'react';

/**
 * ChartSkeleton Component
 * Renders a loading skeleton for a single chart visualization.
 * Mimics the structure of a chart with placeholders for title, insight, and the chart area.
 */
export default function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse h-[400px] flex flex-col">
      {/* Placeholder for the chart title */}
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3"></div>
      
      {/* Placeholder for the chart insight */}
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
      
      {/* Placeholder for the main chart area */}
      <div className="flex-grow bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
        {/* You can add more detailed chart-like shapes here if desired, e.g., bars or lines */}
        <div className="h-24 w-24 bg-gray-200 dark:bg-gray-600 rounded-full opacity-50"></div>
      </div>
    </div>
  );
}
