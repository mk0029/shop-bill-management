import { Zap } from "lucide-react";
import ClientRedirect from "@/components/home/client-redirect";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-800">
      {/* Client-only redirects mounted here; renders null, no SSR mismatch */}
      <ClientRedirect />

      {/* Hero Section (static, deterministic) */}
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
            <div className="mt-8 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-200">Redirecting…</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
