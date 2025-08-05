'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Recommended: Use a union type for chart types for better type-safety and autocompletion.
type ChartType = 'bar' | 'line' | 'pie' | 'scatter';

type ChartConfig = {
  type: ChartType;
  x: string;
  y: string;
  title: string;
  insight: string; // Added 'insight' to match the DashboardPage component
};

// Recommended: Use a more specific type for rawData.
type AnalysisData = {
  summary: string;
  kpis: string[];
  charts: ChartConfig[];
  rawData: Record<string, any>[]; // Record<string, any>[] is better than any[]
  columns: string[]; // Added 'columns' to match the DashboardPage component
  totalRows: number; // Added 'totalRows' to match the DashboardPage component
};

type DataContextType = {
  analysis: AnalysisData | null;
  // Recommended: Use the type from useState for the setter function.
  setAnalysis: React.Dispatch<React.SetStateAction<AnalysisData | null>>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);

  return (
    <DataContext.Provider value={{ analysis, setAnalysis }}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};
