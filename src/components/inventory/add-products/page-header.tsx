"use client";

import { ArrowLeft, Save, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  productCount: number;
  isLoading: boolean;
  onAddProduct: () => void;
  onSaveAll: () => void;
}

export function PageHeader({ productCount, isLoading, onAddProduct, onSaveAll }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="relative mb-6 sm:mb-8">
      {/* Background blur */}
      <div
        className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.4), transparent)" }}
      />
      <div
        className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4), transparent)" }}
      />

      <div className="relative z-10">
        {/* Top row */}
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl transition-all"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
            }}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Add Products
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "rgba(148,163,184,0.7)" }}>
              Create one or multiple inventory items
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Button
            type="button"
            onClick={onAddProduct}
            className="gap-1.5"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(139,92,246,0.1))",
              border: "1px solid rgba(56,189,248,0.2)",
            }}
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>

          {productCount > 0 && (
            <Button
              type="button"
              onClick={onSaveAll}
              disabled={isLoading}
              className="gap-1.5"
              style={{
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.2)",
                color: "rgba(52,211,153,0.9)",
              }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save All ({productCount})
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
