"use client";

import { useEffect, ReactNode } from "react";
import { useDataStore } from "@/store/data-store";
import { useAuthStore } from "@/store/auth-store";
import { useOnline } from "@/hooks/use-online";

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const { loadAdminData, loadCustomerData, isLoading, error, lastSyncTime } = useDataStore();
  const { user, role } = useAuthStore();
  const online = useOnline();

  useEffect(() => {
    // Avoid triggering loads until role is determined
    if (!role) return;
    // Bootstrap only once per app session
    if (lastSyncTime) return;

    if (role === "customer") {
      loadCustomerData({
        userId: user?.id,
        customerId: (user as any)?.customerId,
      });
    } else if (role === "admin") {
      loadAdminData({
        userId: user?.id,
        customerId: (user as any)?.customerId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, lastSyncTime]);

  // Offline-friendly handling: render page and show compact banners
  const retry = () => {
    if (!role) return;
    if (role === "customer") {
      loadCustomerData({ userId: user?.id, customerId: (user as any)?.customerId });
    } else if (role === "admin") {
      loadAdminData({ userId: user?.id, customerId: (user as any)?.customerId });
    }
  };

  const showSyncBanner = online && isLoading && !lastSyncTime;

  return (
    <>
      {/* Inline banners for loading/error states */}
      {!online && (
        <div className="fixed z-50 bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-md bg-yellow-900/60 backdrop-blur border border-yellow-600/40 text-yellow-100 text-sm shadow-lg">
          You are offline. Showing cached data where available.
          <button
            onClick={retry}
            className="ml-3 px-2 py-0.5 rounded bg-yellow-700/60 hover:bg-yellow-700 text-yellow-50 text-xs">
            Retry
          </button>
        </div>
      )}

      {showSyncBanner && (
        <div className="fixed z-50 top-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-200 text-sm shadow">
          Syncing latest data…
        </div>
      )}

      {online && error && (
        <div className="fixed z-50 bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-md bg-red-900/70 backdrop-blur border border-red-700/60 text-red-100 text-sm shadow-lg">
          Failed to load data. <button onClick={retry} className="underline ml-1">Retry</button>
        </div>
      )}

      {children}
    </>
  );
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
        <div className="animate-spin rounded-full sm:h-8 sm:w-8 h-6 w-6  border-b-2 border-blue-500 mx-auto mb-2"></div>
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
