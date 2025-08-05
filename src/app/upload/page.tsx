'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
// Removed: import ThemeToggle from '@/components/ThemeToggle'; // Removed this import

// Import icons from lucide-react
import { UploadCloud, FileText, FileSpreadsheet, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

// Define allowed file types - aligned with backend support
const ALLOWED_FILE_TYPES = [
  'text/csv',
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain', // .txt
];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const { setAnalysis } = useDataContext();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMessage(null); // Clear success message on new file selection
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];

      if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
        setError('Unsupported file type. Please upload a CSV, Excel (.xls/.xlsx), or text file.');
        setFile(null); // Clear selected file if type is unsupported
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size too large. Maximum 5MB allowed.');
        setFile(null); // Clear selected file if size is too large
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('dataset', file); // 'dataset' matches the backend's expected field name

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null); // Clear previous messages

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        // Use errorData.details if available, otherwise fallback to errorData.error or generic message
        throw new Error(errorData.details || errorData.error || 'Failed to analyze file');
      }

      const analysisData = await res.json();

      // Store the analysis data in the DataContext
      setAnalysis(analysisData);
      // ALSO store in sessionStorage for persistence across navigation
      sessionStorage.setItem('aiAnalysisData', JSON.stringify(analysisData));

      setSuccessMessage('File uploaded and analyzed successfully! Redirecting to dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500); // Give user a moment to see success message
      
    } catch (err) {
      console.error("Upload error:", err); // Log the full error for debugging
      setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-gray-700 font-inter text-gray-100">
      {/* Removed ThemeToggle */}
      <div className="bg-gray-800 p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700/50 transform transition-all duration-300 hover:scale-[1.01]">
        <div className="text-center mb-8">
          <UploadCloud className="mx-auto h-16 w-16 text-blue-400 mb-4 animate-bounce-slow" /> {/* Icon with subtle animation */}
          <h1 className="text-3xl font-extrabold text-white mb-2">
            ADmyBRAND Insights
          </h1>
          <p className="text-gray-400 text-lg">Upload Your Data for AI Analysis</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors duration-200 cursor-pointer">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={loading}
              required
              id="dataFile"
            />
            <div className="flex flex-col items-center justify-center">
              {file ? (
                <div className="flex items-center space-x-2 text-green-400">
                  {file.type.includes('excel') || file.type.includes('spreadsheet') ? (
                    <FileSpreadsheet className="h-6 w-6" />
                  ) : (
                    <FileText className="h-6 w-6" />
                  )}
                  <span className="text-base font-medium truncate">{file.name}</span>
                  <span className="text-sm text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="h-10 w-10 text-gray-500 mb-2" />
                  <p className="text-gray-400 text-sm">Drag & Drop or <span className="text-blue-400 font-semibold">Browse File</span></p>
                  <p className="text-gray-500 text-xs mt-1">CSV, Excel (.xls/.xlsx), or text files (Max 5MB)</p>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 text-sm text-red-300 bg-red-900/40 rounded-md border border-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center space-x-2 p-3 text-sm text-green-300 bg-green-900/40 rounded-md border border-green-700">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || loading}
            className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold text-lg transition-all duration-300
                       bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl
                       ${(!file || loading) ? 'opacity-60 cursor-not-allowed bg-blue-700/50' : 'transform hover:-translate-y-0.5'}`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                <span>Processing Data...</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-5 w-5" />
                <span>Analyze Data</span>
              </>
            )}
          </button>
        </form>
      </div>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
