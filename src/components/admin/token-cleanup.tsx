"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export function TokenCleanup() {
  const [isLoading, setIsLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any>(null);

  const cleanupInvalidTokens = async () => {
    setIsLoading(true);
    try {
      // First, get current token stats
      const statsResponse = await fetch("/api/notifications/cleanup-tokens");
      const stats = await statsResponse.json();

      console.log("🧹 Current token stats:", stats);
      setCleanupResult(stats);

      // If there are invalid tokens from recent sends, clean them up
      if (stats.success && stats.stats) {
        toast.success(
          `📊 Current: ${stats.stats.customersWithTokens} customers with ${stats.stats.totalTokens} tokens`,
        );
      }
    } catch (error) {
      console.error("❌ Cleanup error:", error);
      toast.error("Token cleanup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const forceCleanup = async () => {
    setIsLoading(true);
    try {
      // Get the invalid tokens from the recent test
      const invalidTokens = [
        "diPEa6InmUWRKG0L6LcGTo:APA91bGaUXDRhpEej45eQftZ2uW",
        "diPEa6InmUWRKG0L6LcGTo:APA91bEdMz_MgXWOPsvINyPXPGF",
        "eGDedYpIuMxSC9PtLVg4FA:APA91bGUULnV5N5y3aQ1MXoJtsI",
        "eGDedYpIuMxSC9PtLVg4FA:APA91bHxbciUMLVFZhnoFKFd1X0",
      ];

      const response = await fetch("/api/notifications/cleanup-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: invalidTokens }),
      });

      const result = await response.json();
      console.log("🧹 Force cleanup result:", result);

      if (result.success) {
        toast.success(
          `✅ Cleaned ${result.cleanedUsers} users, removed ${result.removedTokens} invalid tokens`,
        );
        // Refresh stats after cleanup
        setTimeout(cleanupInvalidTokens, 1000);
      } else {
        toast.error("Force cleanup failed");
      }
    } catch (error) {
      console.error("❌ Force cleanup error:", error);
      toast.error("Force cleanup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-red-900/20 border-red-600/30">
      <CardHeader>
        <CardTitle className="text-red-400 flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Token Cleanup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-red-200">
          <p>
            <strong>Issue:</strong> Invalid FCM tokens causing send failures
          </p>
          <p>Clean up expired tokens to improve delivery rates.</p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={cleanupInvalidTokens}
            disabled={isLoading}
            variant="outline"
            className="w-full border-red-600 text-red-400 hover:bg-red-600/20"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Checking..." : "Check Token Stats"}
          </Button>

          <Button
            onClick={forceCleanup}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            <Trash2
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-pulse" : ""}`}
            />
            {isLoading ? "Cleaning..." : "Clean Invalid Tokens"}
          </Button>
        </div>

        {cleanupResult && (
          <div className="space-y-2 text-xs">
            <div className="text-red-200 font-medium">Token Statistics:</div>
            <div className="bg-gray-800 p-2 rounded">
              <div>Total Users: {cleanupResult.stats?.totalUsers || 0}</div>
              <div>
                Customer Users: {cleanupResult.stats?.customerUsers || 0}
              </div>
              <div>
                With Tokens: {cleanupResult.stats?.customersWithTokens || 0}
              </div>
              <div>Total Tokens: {cleanupResult.stats?.totalTokens || 0}</div>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-400">
          <p>• Invalid tokens cause UNREGISTERED errors</p>
          <p>• Cleanup removes expired tokens from database</p>
          <p>• Users should re-register tokens after cleanup</p>
        </div>
      </CardContent>
    </Card>
  );
}
