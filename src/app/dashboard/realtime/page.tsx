"use client";

import { SanityRealtimeProvider } from "@/components/providers/SanityRealtimeProvider";
import { RealtimeDashboard } from "@/components/dashboard/RealtimeDashboard";

export default function RealtimeDashboardPage() {
  return (
    <SanityRealtimeProvider>
      <div className="container mx-auto p-6">
        <RealtimeDashboard />
      </div>
    </SanityRealtimeProvider>
  );
}
