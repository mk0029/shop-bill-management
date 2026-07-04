"use client";

import { AlertTriangle, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SaveConfirmModalProps {
  isOpen: boolean;
  isLoading: boolean;
  productCount: number;
  progress: { current: number; total: number };
  onConfirm: () => void;
  onCancel: () => void;
}

export function SaveConfirmModal({
  isOpen,
  isLoading,
  productCount,
  progress,
  onConfirm,
  onCancel,
}: SaveConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onCancel(); }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
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
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="p-2 rounded-xl"
              style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.15)" }}
            >
              <Save className="w-5 h-5" style={{ color: "rgba(56,189,248,0.8)" }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Save Products</h3>
              <p className="text-sm" style={{ color: "rgba(148,163,184,0.7)" }}>
                {isLoading
                  ? `Saving... (${progress.current}/${progress.total})`
                  : `Add ${productCount} product${productCount !== 1 ? "s" : ""} to inventory?`
                }
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="mt-4">
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`,
                    background: "linear-gradient(90deg, rgba(56,189,248,0.4), rgba(139,92,246,0.4))",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-6 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="text-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              background: isLoading ? "rgba(56,189,248,0.1)" : "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(139,92,246,0.15))",
              border: "1px solid rgba(56,189,248,0.25)",
            }}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Add {productCount} Product{productCount !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
