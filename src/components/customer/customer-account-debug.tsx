"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Search, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { safeUserName } from "@/lib/display-text";

export function CustomerAccountDebug() {
  const { user, isAuthenticated } = useAuthStore();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const debugMyAccount = async () => {
    if (!user?.id) {
      toast.error("Not logged in");
      return;
    }

    setIsLoading(true);
    try {
      // Check if this user exists in the database
      const response = await fetch("/api/debug/user-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          clerkId: user.clerkId,
          customerId: (user as any).customerId,
        }),
      });

      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      console.error("❌ Debug error:", error);
      toast.error("Debug failed");
    } finally {
      setIsLoading(false);
    }
  };

  const createCustomerAccount = async () => {
    if (!user?.id) {
      toast.error("Not logged in");
      return;
    }

    try {
      const response = await fetch("/api/debug/create-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          clerkId: user.clerkId,
          customerId: (user as any).customerId,
          name: safeUserName(user?.name || (user as any)?.firstName, "Customer"),
          email: user.email,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Customer account created!");
        // Refresh debug info
        setTimeout(debugMyAccount, 1000);
      } else {
        toast.error(data.error || "Failed to create customer");
      }
    } catch (error) {
      console.error("❌ Create error:", error);
      toast.error("Create failed");
    }
  };

  return (
    <Card className="bg-green-900/20 border-green-600/30">
      <CardHeader>
        <CardTitle className="text-green-400 flex items-center gap-2">
          <User className="w-5 h-5" />
          Customer Account Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-green-200">
          <p>
            <strong>Current User:</strong>
          </p>
          <p>ID: {user?.id}</p>
          <p>Clerk ID: {user?.clerkId}</p>
          <p>Customer ID: {(user as any)?.customerId}</p>
          <p>Name: {safeUserName(user?.name || (user as any)?.firstName, "Customer")}</p>
          <p>Email: {user?.email}</p>
        </div>

        <Button
          onClick={debugMyAccount}
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <Search className="w-4 h-4 mr-2" />
          {isLoading ? "Searching..." : "Find My Account"}
        </Button>

        {debugInfo && (
          <div className="space-y-2 text-xs">
            <div className="text-green-200 font-medium">Account Status:</div>
            <div className="bg-gray-800 p-2 rounded">
              <div>Found in DB: {debugInfo.found ? "✅ Yes" : "❌ No"}</div>
              <div>Has Tokens: {debugInfo.hasTokens ? "✅ Yes" : "❌ No"}</div>
              <div>Token Count: {debugInfo.tokenCount || 0}</div>
              {debugInfo.userData && (
                <div className="mt-2 text-gray-300">
                  <div>DB Name: {safeUserName(debugInfo.userData.name)}</div>
                  <div>DB ID: {debugInfo.userData._id}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {debugInfo && !debugInfo.found && (
          <Button
            onClick={createCustomerAccount}
            variant="outline"
            className="w-full border-green-600 text-green-400 hover:bg-green-600/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Create Customer Account
          </Button>
        )}

        <div className="text-xs text-gray-400">
          <p>• This checks if your customer account exists</p>
          <p>• Shows FCM token registration status</p>
          <p>• Can create missing customer accounts</p>
        </div>
      </CardContent>
    </Card>
  );
}
