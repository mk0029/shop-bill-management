import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailedRealtimeStatus } from "@/components/providers/SanityRealtimeProvider";

export function ConnectionStatusSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Connection Status</CardTitle>
      </CardHeader>
      <CardContent>
        <DetailedRealtimeStatus />

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-2">How it works:</h4>
          <ul className="text-sm space-y-1 text-gray-600">
            <li>• All data changes sync automatically across devices</li>
            <li>• Create/update/delete operations appear instantly</li>
            <li>• No page refresh needed - everything updates live</li>
            <li>• Works with multiple users simultaneously</li>
            <li>• Powered by Sanity's real-time infrastructure</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default ConnectionStatusSection;
