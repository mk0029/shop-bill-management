"use client";

import React from "react";
import {
  useSanityRealtime,
  useSanityAlerts,
  useSanityStats,
  useSanityOperations,
} from "@/hooks/useSanityRealtime";
import { SanityRealtimeStatus } from "@/components/providers/SanityRealtimeProvider";
import { DashboardStatsCards } from "./dashboard-stats-cards";
import { AlertsSection } from "./alerts-section";
import { ConnectionStatusSection } from "./connection-status-section";

export function RealtimeDashboard() {
  const { isConnected } = useSanityRealtime();
  const alerts = useSanityAlerts();
  const stats = useSanityStats();
  const operations = useSanityOperations();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Real-time Dashboard
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Live data synchronized across all devices via Sanity
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <SanityRealtimeStatus />
        </div>
      </div>

      {/* Stats Cards */}
      <DashboardStatsCards
        stats={{
          totalCustomers: (stats as any).users?.customers || 0,
          totalProducts: (stats as any).products?.total || 0,
          totalBills: (stats as any).bills?.total || 0,
          totalRevenue: (stats as any).bills?.totalRevenue || 0,
          pendingBills: (stats as any).bills?.pending || 0,
          lowStockItems: 0,
        }}
      />

      {/* Alerts Section */}
      <AlertsSection alerts={alerts as any} />

      {/* Connection Details */}
      <ConnectionStatusSection />
    </div>
  );
}
