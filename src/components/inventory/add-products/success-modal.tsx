"use client";

import { CheckCircle, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessModalProps {
  isOpen: boolean;
  productCount: number;
  onViewInventory: () => void;
  onAddMore: () => void;
}

export function SuccessModal({ isOpen, productCount, onViewInventory, onAddMore }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden text-center"
        style={{
          background: "rgba(15, 23, 42, 0.7)",
          backdropFilter: "blur(32px) saturate(160%)",
          WebkitBackdropFilter: "blur(32px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 25px 60px rgba(0,0,0,0.5)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-8">
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{
              background: "rgba(52,211,153,0.12)",
              border: "1px solid rgba(52,211,153,0.2)",
            }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: "rgba(52,211,153,0.8)" }} />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Products Added Successfully</h3>
          <p className="text-sm" style={{ color: "rgba(148,163,184,0.7)" }}>
            {productCount} product{productCount !== 1 ? "s have" : " has"} been added to your inventory
          </p>
        </div>

        <div
          className="flex items-center justify-center gap-3 px-6 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Button
            type="button"
            onClick={onViewInventory}
            className="gap-1.5"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(139,92,246,0.15))",
              border: "1px solid rgba(56,189,248,0.25)",
            }}
          >
            <Eye className="w-4 h-4" />
            View Inventory
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onAddMore}
            className="gap-1.5 text-slate-300"
          >
            <Plus className="w-4 h-4" />
            Add More
          </Button>
        </div>
      </div>
    </div>
  );
}
