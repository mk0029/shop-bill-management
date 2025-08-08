"use client";

import { useEffect, ReactNode } from "react";
import { useDataStore } from "@/store/data-store";
import { useAuthStore } from "@/store/auth-store";

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const { loadInitialData, isLoading, error } = useDataStore();
  const { user } = useAuthStore();

  useEffect(() => {
    // Load data when component mounts
    loadInitialData();
  }, [loadInitialData]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading data...</p>
          <p className="text-gray-400 text-sm">Syncing with Sanity backend</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-white text-xl mb-2">Failed to Load Data</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => loadInitialData()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors mr-2"
            >
              Retry
            </button>
            <a
              href="/debug"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors inline-block"
            >
              Debug Connection
            </a>
          </div>
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded text-left">
            <p className="text-yellow-200 text-xs sm:text-sm font-medium mb-1">
              Quick Fix:
            </p>
            <p className="text-yellow-300 text-xs">
              Make sure your SANITY_API_TOKEN is set in .env.local
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Loading component for individual sections
export function DataLoadingSpinner({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-gray-400 text-sm">{message}</p>
      </div>
    </div>
  );
}

// Error component for individual sections
export function DataError({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-red-500 text-2xl mb-2">⚠️</div>
        <p className="text-gray-400 text-sm mb-2">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-blue-500 hover:text-blue-400 text-sm underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
