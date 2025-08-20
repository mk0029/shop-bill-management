"use client";

import { useNetworkMonitor } from "@/hooks/use-network-monitor";
import { WifiOff, Wifi, Timer } from "lucide-react";

export function SidebarNetworkStatus() {
  const { online, latencyMs, color, lastUpdated } = useNetworkMonitor();

  const colorClasses = {
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    gray: "text-gray-400",
  } as const;

  const dotColor = colorClasses[color as keyof typeof colorClasses] || "text-gray-400";

  const stale = !online;
  const lastText = latencyMs != null ? `${latencyMs} ms` : "--";
  const updatedText = lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : null;

  return (
    <div className="mt-2 mb-2 px-4 py-2 rounded-lg bg-gray-800/60 border border-gray-700 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {online ? (
          <Wifi className={`w-4 h-4 ${dotColor}`} />
        ) : (
          <WifiOff className="w-4 h-4 text-red-400" />
        )}
        <span className="text-sm text-gray-300">Network</span>
      </div>
      <div className="flex items-center gap-2">
        {online ? (
          <span className={`text-xs font-medium ${dotColor}`}>
            Latency: {lastText}
          </span>
        ) : (
          <div className="text-gray-500 flex items-center gap-1">
            {/* <Timer className="w-3 h-3" /> */}
            <span>Offline {lastText}</span>
          </div>
        )}
        <span className={`inline-block w-2 h-2 rounded-full ${online ? (color === "green" ? "bg-green-400" : color === "yellow" ? "bg-yellow-400" : "bg-red-400") : "bg-red-500"}`}></span>
      </div>
    </div>
  );
}
