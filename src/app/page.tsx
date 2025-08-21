"use client";

import {
  Zap
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
    <div className="min-h-screen bg-gray-800">
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


            {/* Auto-redirect Message */}
            <div className="mt-8 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-200">
                Redirecting to login page in  seconds...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
