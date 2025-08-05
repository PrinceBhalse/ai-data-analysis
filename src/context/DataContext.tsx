'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define types for better type safety
interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  x: string;
  y: string;
  title: string;
  insight: string;
}

interface AnalysisData {
  summary: string;
  kpis: string[];
  charts: ChartConfig[];
  rawData: Record<string, unknown>[]; // Fixed 'any' to 'unknown'
  columns: string[];
  totalRows: number;
}

interface DataContextType {
  analysis: AnalysisData | null;
  setAnalysis: (data: AnalysisData | null) => void;
}

// 1. DataContext
const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);

  return (
    <DataContext.Provider value={{ analysis, setAnalysis }}>
      {children}
    </DataContext.Provider>
  );
}

// Custom hook to use the DataContext
export function useDataContext() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
}
