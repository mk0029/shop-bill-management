"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

interface RealtimeContextType {
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(
  undefined
);

interface RealtimeProviderProps {
  children: React.ReactNode;
  enableNotifications?: boolean;
  enableAutoRefresh?: boolean;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({
  children,
  enableNotifications = false, // Disable notifications by default for cleaner UX
  enableAutoRefresh = true,
}) => {
  const { isConnected } = useRealtimeSync({
    enableNotifications,
    enableAutoRefresh,
  });

  const contextValue: RealtimeContextType = {
    isConnected,
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
};

// Higher-order component for pages that need real-time sync
export const withRealtimeSync = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    enableNotifications?: boolean;
    enableAutoRefresh?: boolean;
  }
) => {
  const WrappedComponent: React.FC<P> = (props) => {
    return (
      <RealtimeProvider {...options}>
        <Component {...props} />
      </RealtimeProvider>
    );
  };

  WrappedComponent.displayName = `withRealtimeSync(${
    Component.displayName || Component.name
  })`;
  return WrappedComponent;
};
