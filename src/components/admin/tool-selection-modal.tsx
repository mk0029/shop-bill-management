"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Wrench, Package } from "lucide-react";
import type { ToolItem } from "@/lib/tool-rental-service";

function formatINR(value: number) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

interface ToolSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tools: ToolItem[];
  onSelect: (tool: ToolItem) => void;
}

const glassStyle: React.CSSProperties = {
  background: "rgba(15,23,42,0.7)",
  backdropFilter: "blur(32px) saturate(160%)",
  WebkitBackdropFilter: "blur(32px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 25px 60px rgba(0,0,0,0.5)",
};

export default function ToolSelectionModal({
  isOpen,
  onClose,
  tools,
  onSelect,
}: ToolSelectionModalProps) {
  const [search, setSearch] = useState("");

  const filteredTools = useMemo(() => {
    if (!search.trim()) return tools;
    const q = search.toLowerCase();
    return tools.filter(
      (t) =>
        t.toolName.toLowerCase().includes(q) ||
        t.toolCode.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    );
  }, [tools, search]);

  const handleSelect = (tool: ToolItem) => {
    if (tool.availableQuantity <= 0) return;
    onSelect(tool);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-[22px]"
        style={glassStyle}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-2 text-white">
            <Wrench className="h-4 w-4 text-cyan-300" />
            <h2 className="text-lg font-semibold">Select Tool</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.08] bg-white/[0.05] text-slate-400 transition hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-white/[0.06] px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code or category..."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 pl-9 text-sm text-slate-100 placeholder-slate-400/80 outline-none focus:border-cyan-300/30"
              autoFocus
            />
          </div>
        </div>

        {/* Tool List */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 max-h-[60dvh]">
          {filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Package className="mb-3 h-10 w-10 text-slate-700" />
              <p className="text-sm font-medium text-slate-400">No tools found</p>
              <p className="mt-1 text-xs text-slate-600">
                {search ? "Try a different search term" : "No tools available"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTools.map((tool) => {
                const outOfStock = tool.availableQuantity <= 0;
                return (
                  <button
                    key={tool._id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => handleSelect(tool)}
                    className={`w-full text-left rounded-lg border transition-all p-3 ${
                      outOfStock
                        ? "border-white/[0.04] bg-white/[0.02] opacity-50 cursor-not-allowed"
                        : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1] cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-white truncate">
                            {tool.toolName}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            [{tool.toolCode}]
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {tool.category}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span>{formatINR(tool.rentPricePerHour)}/hr</span>
                          <span>{formatINR(tool.rentPricePerDay)}/day</span>
                          <span
                            className={`${
                              outOfStock ? "text-red-400" : "text-emerald-400"
                            }`}
                          >
                            {tool.availableQuantity}/{tool.totalQuantity} avail
                          </span>
                        </div>
                      </div>
                      {!outOfStock && (
                        <span className="shrink-0 rounded-md border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200">
                          Select
                        </span>
                      )}
                      {outOfStock && (
                        <span className="shrink-0 rounded-md border border-red-300/20 bg-red-400/10 px-2.5 py-1 text-[11px] font-medium text-red-300">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
