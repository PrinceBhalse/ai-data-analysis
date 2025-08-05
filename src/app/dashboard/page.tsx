'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

import { useDataContext } from '@/context/DataContext';
import DataTable from '@/components/DataTable';
import SummarySkeleton from '@/components/SummarySkeleton';
import ChartSkeleton from '@/components/ChartSkeleton';
import { exportToCsv } from '../utils/export';

// Define types for better type safety
// Moved AnalysisData interface to DataContext.tsx if it's used globally
// If only used here, keep it. For now, assuming it's used globally and defined in DataContext.tsx
// interface AnalysisData { ... } // Removed if defined globally

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  x: string;
  y: string;
  title: string;
  insight: string;
}

// 2. ErrorBoundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState { // Fixed unused '_' warning
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// 3. KpiCard Component
interface KpiCardProps {
  text: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ text }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-center text-center">
      <p className="text-lg font-medium text-gray-800 dark:text-white">{text}</p>
    </div>
  );
};

// 4. ChartRenderer Component
interface ChartRendererProps {
  config: ChartConfig;
  data: Record<string, any>[]; // Fixed 'any' type here
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
  
  const getNumericValue = (item: Record<string, any>, key: string) => { // Fixed 'any' type here
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

// 5. DashboardPage Component
export default function DashboardPage() {
  const { analysis, setAnalysis } = useDataContext();
  const router = useRouter();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Destructure analysis data (ensure columns is destructured)
  // This must be done unconditionally before any conditional returns
  const { summary, kpis = [], charts = [], rawData = [], columns = [] } = analysis || {}; // Use default empty objects/arrays if analysis is null

  // PDF download function - defined unconditionally
  const downloadPDF = useCallback(async () => {
    try {
      setIsGeneratingPDF(true);
      setPdfError(null);

      const element = document.getElementById('dashboard');
      if (!element) {
        throw new Error('Dashboard element not found for PDF generation.');
      }

      // Temporarily hide sections that might cause issues for html2canvas
      const kpiSection = document.getElementById('kpi-section');
      const dataTableSection = document.getElementById('data-table-section');
      if (kpiSection) kpiSection.style.display = 'none';
      if (dataTableSection) dataTableSection.style.display = 'none';

      // Apply a global class to the body for PDF styling
      document.body.classList.add('pdf-export-active');

      // Use a timeout to ensure all styles are applied before rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        scale: 2, // Increase scale for better resolution in PDF
        useCORS: true, // Enable cross-origin image loading if any
        logging: true, // Enable logging for debugging html2canvas issues
        backgroundColor: '#ffffff', // Force white background for the canvas
        onclone: (clonedDoc) => {
          // This function runs on the cloned DOM, before canvas rendering
          const clonedDashboard = clonedDoc.getElementById('dashboard');
          if (clonedDashboard) {
            // Force ALL elements within the cloned dashboard to use basic colors
            clonedDashboard.querySelectorAll('*').forEach(el => {
              const htmlEl = el as HTMLElement; // Cast to HTMLElement to access style
              
              // Remove any dark mode classes
              htmlEl.classList.forEach(cls => {
                if (cls.startsWith('dark:')) {
                  htmlEl.classList.remove(cls);
                }
              });

              // Explicitly set background and color to white/black using setProperty with !important
              htmlEl.style.setProperty('background-color', '#ffffff', 'important');
              htmlEl.style.setProperty('color', '#000000', 'important');
              
              // Also ensure fill and stroke properties (for SVG elements like charts) are black
              htmlEl.style.setProperty('fill', '#000000', 'important'); 
              htmlEl.style.setProperty('stroke', '#000000', 'important'); 

              // Ensure recharts text is black
              if (htmlEl.classList.contains('recharts-text')) {
                htmlEl.style.setProperty('fill', '#000000', 'important');
              }
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgRatio = imgProps.width / imgProps.height;
      let pdfWidth = pageWidth - 20;
      let pdfHeight = pdfWidth / imgRatio;
      if (pdfHeight > pageHeight - 20) {
        pdfHeight = pageHeight - 20;
        pdfWidth = pdfHeight * imgRatio;
      }
      const x = (pageWidth - pdfWidth) / 2;
      const y = (pageHeight - pdfHeight) / 2;
      pdf.addImage(imgData, 'PNG', x, y, pdfWidth, pdfHeight);
      pdf.save(`AI_Dashboard_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      setPdfError(error instanceof Error ? error.message : 'Failed to generate PDF');
    } finally {
      // Re-show hidden sections
      const kpiSection = document.getElementById('kpi-section');
      const dataTableSection = document.getElementById('data-table-section');
      if (kpiSection) kpiSection.style.display = ''; // Reset to default display
      if (dataTableSection) dataTableSection.style.display = ''; // Reset to default display

      // Clean up temporary classes
      document.body.classList.remove('pdf-export-active');
      const element = document.getElementById('dashboard');
      element?.classList.remove('pdf-generation');
      setIsGeneratingPDF(false);
    }
  }, [analysis]); // analysis is a dependency because its properties (rawData, columns) are used indirectly

  // CSV download function - defined unconditionally
  const downloadCSV = useCallback(() => {
    if (rawData.length === 0) {
      setPdfError("No data available to export to CSV.");
      return;
    }
    
    const csvColumns = columns.map(col => ({ key: col, header: col }));
    
    try {
        exportToCsv(rawData, `AI_Data_${new Date().toISOString().slice(0, 10)}.csv`, csvColumns);
        console.log("CSV Download initiated.");
        setPdfError(null); // Clear any previous error
    } catch (error) {
        console.error("CSV export failed:", error);
        setPdfError(error instanceof Error ? error.message : "An error occurred during CSV export.");
    }
  }, [rawData, columns]); // rawData and columns are dependencies

  // Effect to load analysis data from sessionStorage if not in context
  useEffect(() => {
    if (!analysis) {
      const storedAnalysis = sessionStorage.getItem('aiAnalysisData');
      if (storedAnalysis) {
        try {
          const parsedData = JSON.parse(storedAnalysis);
          setAnalysis(parsedData); // Set it to context
        } catch (e) {
          console.error("Failed to parse stored analysis data from sessionStorage:", e);
          sessionStorage.removeItem('aiAnalysisData'); // Clear corrupt data
          router.push('/upload'); // Redirect to upload
        }
      } else {
        router.push('/upload'); // If no data found anywhere, redirect
      }
    }
  }, [analysis, setAnalysis, router]);


  // Show loading state with skeletons if analysis data is not yet available
  if (!analysis) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center w-full max-w-7xl mx-auto">
          <SummarySkeleton />

          {/* Placeholder for KPIs skeleton */}
          <section className="mb-10 min-w-[800px]">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Key Performance Indicators</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Render a few KpiCardSkeletons here (you'll create this next) */}
              <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          </section>

          {/* Render multiple ChartSkeletons */}
          <section className="mb-10 min-w-[800px]">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Data Visualizations</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartSkeleton />
              <ChartSkeleton />
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </section>

          <p className="mt-8 text-lg text-gray-700 dark:text-gray-300">Analyzing your data and preparing visualizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-inter">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center rounded-b-lg">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">AI Analytics Dashboard</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={downloadPDF}
            disabled={isGeneratingPDF}
            className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-all duration-200
              ${isGeneratingPDF ? 'opacity-75 cursor-not-allowed' : 'shadow-md hover:shadow-lg'}`}
          >
            {isGeneratingPDF ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating PDF...
              </>
            ) : (
              'Download PDF Report'
            )}
          </button>
          <button
            onClick={downloadCSV}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Download CSV
          </button>
        </div>
      </header>

      {pdfError && (
        <div className="fixed top-20 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg max-w-md z-50 dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          <p>Error: {pdfError}</p>
          <button
            onClick={() => setPdfError(null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium dark:text-red-300 dark:hover:text-red-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <main id="dashboard" className="p-4 md:p-6 max-w-7xl mx-auto">
        <section className="mb-10 bg-white dark:bg-gray-800 rounded-lg shadow p-6 min-w-[800px] transition-colors duration-200">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">AI Analysis Summary</h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{summary}</p>
        </section>

        {kpis.length > 0 && (
          <section id="kpi-section" className="mb-10 min-w-[800px]">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Key Performance Indicators</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kpis.map((kpi, index) => (
                <KpiCard key={`kpi-${index}`} text={kpi} />
              ))}
            </div>
          </section>
        )}

        {charts.length > 0 && (
          <section className="mb-10 min-w-[800px]">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Data Visualizations</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {charts.map((chart, index) => (
                <div key={`chart-${index}`} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors duration-200">
                  <ErrorBoundary fallback={<ChartErrorFallback />}>
                    <ChartRenderer config={chart} data={rawData} />
                  </ErrorBoundary>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {rawData.length > 0 && (
          <section id="data-table-section" className="mb-10 min-w-[800px]">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Raw Data Table</h2>
            <DataTable
              data={rawData}
              columns={Object.keys(rawData[0] || {}).map(key => ({
                key: key,
                header: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                sortable: true,
                filterable: true,
              }))}
              pageSize={10}
              title="Full Dataset"
              description="Explore the raw data with sorting, filtering, and pagination."
            />
          </section>
        )}
      </main>

      <style jsx global>{`
        html, body {
          font-family: 'Inter', sans-serif;
        }

        .pdf-export-active body {
          background-color: #ffffff !important;
          color: #000000 !important;
        }

        .pdf-export {
          background-color: #ffffff !important;
          color: #000000 !important;
        }

        .recharts-text {
          fill: #000000 !important;
        }
      `}</style>
    </div>
  );
}
