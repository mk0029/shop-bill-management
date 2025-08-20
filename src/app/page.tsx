"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Package,
  Users,
  FileText,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  // Simple redirect to login after showing the landing page
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/login");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

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

            {/* Static Stats for Demo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="sm:p-4 p-3 text-center">
                  <Package className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                    150+
                  </p>
                  <p className="text-xs text-gray-400">Products</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="sm:p-4 p-3 text-center">
                  <Users className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                    50+
                  </p>
                  <p className="text-xs text-gray-400">Customers</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="sm:p-4 p-3 text-center">
                  <FileText className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                  <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                    200+
                  </p>
                  <p className="text-xs text-gray-400">Bills</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="sm:p-4 p-3 text-center">
                  <DollarSign className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">₹2,50,000</p>
                  <p className="text-xs text-gray-400">Revenue</p>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/admin/dashboard">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Admin Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/customer/bills">
                <Button size="lg" variant="outline">
                  Customer Portal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Auto-redirect Message */}
            <div className="mt-8 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-200">
                Redirecting to login page in 5 seconds...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
