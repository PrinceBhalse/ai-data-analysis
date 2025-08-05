'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

// Define types for the data and columns
interface Column<T> {
  key: keyof T; // Key to access the data property
  header: string; // Display name for the column header
  sortable?: boolean; // Is the column sortable?
  filterable?: boolean; // Is the column filterable?
  render?: (value: T[keyof T], row: T) => React.ReactNode; // Custom render function for cells
}

interface DataTableProps<T extends Record<string, unknown>> { // Fixed 'any' to 'unknown'
  data: T[]; // The array of data objects
  columns?: Column<T>[]; // Optional explicit column definitions
  pageSize?: number; // Number of rows per page
  title?: string; // Optional title for the table
  description?: string; // Optional description for the table
}

export default function DataTable<T extends Record<string, unknown>>({ // Fixed 'any' to 'unknown'
  data,
  columns: propColumns,
  pageSize = 10,
  title,
  description,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Infer columns if not provided, or use provided columns
  const columns = useMemo(() => {
    if (propColumns && propColumns.length > 0) {
      return propColumns;
    }
    if (data.length === 0) {
      return [];
    }
    // Infer columns from the first data object
    return Object.keys(data[0]).map(key => ({
      key: key as keyof T,
      header: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), // Basic camelCase to Title Case
      sortable: true,
      filterable: true,
    })) as Column<T>[];
  }, [propColumns, data]);

  // Reset page to 1 when data, search term, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data, searchTerm, sortColumn, sortDirection]);

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply global search filter
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        columns.some(col => {
          const value = String(row[col.key]).toLowerCase();
          return value.includes(lowerCaseSearchTerm);
        })
      );
    }

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        // Handle numbers and other comparable types
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection, columns]);

  // Pagination logic
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return processedData.slice(startIndex, endIndex);
  }, [processedData, currentPage, pageSize]);

  const handleSort = (columnKey: keyof T, sortable: boolean | undefined) => {
    if (!sortable) return;

    if (sortColumn === columnKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {title && (
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{title}</h2>
      )}
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      )}

      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-1/2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search all columns..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        {/* You could add per-column filters here later if needed */}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider
                    ${col.sortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150' : ''}`}
                  onClick={() => handleSort(col.key, col.sortable)}
                >
                  <div className="flex items-center">
                    {col.header}
                    {col.sortable && (
                      <span className="ml-2">
                        {sortColumn === col.key && sortDirection === 'asc' && <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                        {sortColumn === col.key && sortDirection === 'desc' && <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                        {sortColumn !== col.key && <ChevronUp className="h-4 w-4 text-gray-300 dark:text-gray-500 opacity-0 group-hover:opacity-100" />} {/* Placeholder for alignment */}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No data available or matches your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {processedData.length > pageSize && (
        <div className="flex items-center justify-between mt-4 px-4 py-3 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * pageSize, processedData.length)}</span> of{' '}
                <span className="font-medium">{processedData.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <span className="sr-only">First</span>
                  <ChevronsLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                {/* Page numbers can be added dynamically here if desired */}
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <span className="sr-only">Last</span>
                  <ChevronsRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
