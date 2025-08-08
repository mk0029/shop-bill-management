"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
  const [isCreating, setIsCreating] = useState(false);

  // Demo function to create a test brand
  const createTestBrand = async () => {
    setIsCreating(true);
    try {
      const success = await operations.brands.create({
        name: `Test Brand ${Date.now()}`,
        description: "A test brand created via real-time demo",
        isActive: true,
        contactInfo: {
          email: "test@example.com",
          phone: "+1234567890",
        },
      });

      if (success) {
        console.log("✅ Test brand created successfully");
      }
    } catch (error) {
      console.error("❌ Failed to create test brand:", error);
    } finally {
      setIsCreating(false);
    }
  };

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
          <Button
            onClick={createTestBrand}
            disabled={isCreating || !isConnected}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isCreating ? "Creating..." : "Create Test Brand"}
          </Button>
          <SanityRealtimeStatus />
        </div>
      </div>

      {/* Stats Cards */}
      <DashboardStatsCards stats={stats} />

      {/* Alerts Section */}
      <AlertsSection alerts={alerts} />

      {/* Connection Details */}
      <ConnectionStatusSection />
    </div>
  );
}
