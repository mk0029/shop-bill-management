"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import { useDashboardStats } from "@/hooks/use-sanity-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Database,
  RefreshCw,
  Package,
  Users,
  FileText,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, role } = useAuthStore();
  const { isLoading, lastSyncTime } = useDataStore();
  const stats = useDashboardStats();

  useEffect(() => {
    if (isAuthenticated && role) {
      // Redirect based on role after a short delay to show the integration
      const timer = setTimeout(() => {
        if (role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/customer/home");
        }
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      // Redirect to login if not authenticated after showing integration
      const timer = setTimeout(() => {
        router.push("/login");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, role, router]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
        <div className="relative max-w-4xl mx-auto px-6 py-24">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Zap className="h-8 w-8 text-yellow-500" />
              <h1 className="text-4xl md:text-6xl font-bold text-white">
                Electrician Shop
              </h1>
            </div>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Professional shop management system with real-time Sanity CMS
              integration.
            </p>

            {/* Sync Status */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <Badge
                variant="outline"
                className="text-green-500 border-green-500"
              >
                <Database className="h-3 w-3 mr-2" />
                Sanity Connected
              </Badge>
              {lastSyncTime && (
                <Badge
                  variant="outline"
                  className="text-blue-500 border-blue-500"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Synced: {lastSyncTime.toLocaleTimeString()}
                </Badge>
              )}
            </div>

            {/* Loading or Stats */}
            {isLoading ? (
              <Card className="bg-gray-800 border-gray-700 mb-8">
                <CardContent>
                  <div className="text-gray-100 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-lg font-medium">
                      Loading data from Sanity...
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Syncing products, customers, and bills
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="sm:p-4 p-3 text-center">
                    <Package className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                      {stats.totalProducts}
                    </p>
                    <p className="text-xs text-gray-400">Products</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="sm:p-4 p-3 text-center">
                    <Users className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                      {stats.totalCustomers}
                    </p>
                    <p className="text-xs text-gray-400">Customers</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="sm:p-4 p-3 text-center">
                    <FileText className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                    <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                      {stats.totalBills}
                    </p>
                    <p className="text-xs text-gray-400">Bills</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="sm:p-4 p-3 text-center">
                    <DollarSign className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                    <p className="text-lg font-bold text-white">
                      ₹{stats.totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">Revenue</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/admin/dashboard">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Admin Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/customer/home">
                <Button size="lg" variant="outline">
                  Customer Portal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Redirect Message */}
            {isAuthenticated && (
              <div className="mt-8 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                <p className="text-blue-200">
                  Redirecting to{" "}
                  {role === "admin" ? "Admin Dashboard" : "Customer Portal"}...
                </p>
              </div>
            )}

            {!isAuthenticated && (
              <div className="mt-8 p-4 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-200">Redirecting to login page...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
