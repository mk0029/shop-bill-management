"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as toolRentalApi from "@/lib/tool-rental-api";
import type { ToolItem } from "@/lib/tool-rental-service";
import { toast } from "sonner";
import { confirmDialog } from "@/store/confirm-store";

export default function AdminToolsListClient() {
  const router = useRouter();
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await toolRentalApi.getTools();
      setTools(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load tools");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.toolName?.toLowerCase().includes(q) ||
        t.toolCode?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q),
    );
  }, [query, tools]);

  const onDisable = async (tool: ToolItem) => {
    const ok = await confirmDialog({ title: "Disable Tool?", description: `Are you sure you want to disable "${tool.toolName}"? This will remove it permanently.`, confirmText: "Disable", variant: "destructive" });
    if (!ok) return;
    try {
      await toolRentalApi.deleteTool(tool._id);
      toast.success("Tool disabled");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to disable tool");
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-white">Tools</h1>
        <button
          type="button"
          onClick={() => router.push("/admin/tools/create")}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded px-3 py-2 text-sm sm:px-4 sm:py-2 transition-colors"
        >
          Add Tool
        </button>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-white font-semibold text-base sm:text-lg">
            Tools
          </h3>
          <input
            className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full sm:max-w-xs"
            placeholder="Search by name/code/category"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-gray-400">Loading tools...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400">No tools found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((tool) => {
              const isAvailable = tool.isActive && tool.availableQuantity > 0;
              return (
                <div
                  key={tool._id}
                  className="border border-gray-800 rounded-lg p-3 bg-gray-950/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{tool.toolName}</p>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                        {tool.toolCode}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${isAvailable ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}
                      >
                        {isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {tool.category} | ?{tool.rentPricePerHour}/hr | ?
                      {tool.rentPricePerDay}/day | {tool.availableQuantity}/
                      {tool.totalQuantity}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        router.push(`/admin/tools/edit/${tool._id}`)
                      }
                      className="bg-amber-600 hover:bg-amber-500 text-white rounded px-3 py-1.5 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDisable(tool)}
                      className="bg-red-700 hover:bg-red-600 text-white rounded px-3 py-1.5 text-sm"
                    >
                      Disable
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
