'use client';

import React from 'react';

/**
 * SummarySkeleton Component
 * Renders a loading skeleton for the AI Analysis Summary section.
 * Provides a visual cue that content is being loaded.
 */
export default function SummarySkeleton() {
  return (
    <div className="mb-10 bg-white dark:bg-gray-800 rounded-lg shadow p-6 min-w-[800px] animate-pulse">
      {/* Placeholder for the title */}
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
      
      {/* Placeholder for the summary paragraphs */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
      </div>
    </div>
  );
}
