/**
 * Converts an array of JavaScript objects to a CSV string and triggers a download.
 *
 * @param data The array of objects to export. Each object represents a row.
 * @param filename The desired filename for the CSV file (e.g., "my_data.csv").
 * @param columns Optional array of column keys to specify order and headers.
 * If not provided, all keys from the first object will be used.
 */
export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header?: string }[]
) {
  if (!data || data.length === 0) {
    console.warn('No data provided for CSV export.');
    return;
  }

  // Determine columns and headers
  const keys = columns ? columns.map(col => col.key) : Object.keys(data[0]);
  const headers = columns ? columns.map(col => col.header || String(col.key)) : keys.map(key => String(key));

  // Helper function to escape values for CSV (handle commas and quotes)
  const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    const stringValue = String(value);
    // If the value contains a comma, double quote, or newline, enclose it in double quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      // Escape double quotes by doubling them
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Create CSV rows
  const csvRows = [];
  csvRows.push(headers.map(escapeCsvValue).join(',')); // Add header row

  for (const row of data) {
    const values = keys.map(key => escapeCsvValue(row[key]));
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');

  // Create a Blob and trigger download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) { // Feature detection for download attribute
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden'; // Hide the link
    document.body.appendChild(link);
    link.click(); // Programmatically click the link
    document.body.removeChild(link); // Clean up
    URL.revokeObjectURL(url); // Release the object URL
  } else {
    // Fallback for browsers that don't support the download attribute
    alert('Your browser does not support downloading files directly. Please copy the data manually.');
    // Optionally, you could display the CSV string in a textarea for manual copying
  }
}
