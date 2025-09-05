"use client";

import LoadingSpinner from "../components/ui/loading-spinner";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="rounded-lg border border-gray-700 bg-gray-900/90 px-4 py-3 shadow-xl">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    </div>
  );
}
