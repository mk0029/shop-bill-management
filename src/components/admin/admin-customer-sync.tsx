"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, RefreshCw, Database, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function AdminCustomerSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const syncAllCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sync/all-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      console.log("🔄 Customer sync result:", result);
      setSyncResult(result);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || "Sync failed");
      }
    } catch (error) {
      console.error("❌ Sync error:", error);
      toast.error("Sync failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-orange-900/20 border-orange-600/30">
      <CardHeader>
        <CardTitle className="text-orange-400 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Customer Database Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-orange-200">
          <p className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <strong>Customer Analysis:</strong> Check Sanity users database
          </p>
          <p>
            Analyze all customers in your Sanity database and their FCM token
            status.
          </p>
        </div>

        <Button
          onClick={syncAllCustomers}
          disabled={isLoading}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          {isLoading ? "Analyzing Customers..." : "Analyze All Customers"}
        </Button>

        {syncResult && (
          <div className="space-y-2 text-xs">
            <div className="text-orange-200 font-medium">Sync Results:</div>
            <div className="bg-gray-800 p-2 rounded">
              <div>Total Users: {syncResult.stats?.totalUsers || 0}</div>
              <div>Customer Users: {syncResult.stats?.customerUsers || 0}</div>
              <div>
                With FCM Tokens: {syncResult.stats?.customersWithTokens || 0}
              </div>
              <div>Admin Users: {syncResult.stats?.adminUsers || 0}</div>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-400">
          <p>• Analyzes your Sanity users database</p>
          <p>• Shows customer count and FCM token status</p>
          <p>• Helps identify notification coverage gaps</p>
        </div>
      </CardContent>
    </Card>
  );
}
