"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { useFittingRates } from "@/components/billing/fitting-calculator";

function safeNum(n: number | string): number {
  const x = typeof n === "string" ? Number(n) : n;
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
}

export default function AdminFittingRatesSection() {
  const { rates, loading, error, setRates } = useFittingRates();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const onSave = async () => {
    if (!rates) return;
    setSaving(true);
    setSaveError(null);
    setSavedOk(false);
    try {
      const res = await fetch("/api/fitting-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rates),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || `Failed (${res.status})`);
      }
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    } catch (e: any) {
      setSaveError(e?.message || "Failed to save rates");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="border-b border-white/5 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-slate-100">Fitting/Wiring Rates</h2>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <div className="text-sm font-medium text-slate-100">Manage rate per point</div>
            <div className="mt-0.5 text-xs text-slate-400">These rates are used by the Fitting/Wiring calculator and the customer estimator.</div>
          </div>
        </div>

        {loading && <div className="text-xs text-slate-400">Loading rates...</div>}
        {error && <div className="text-xs text-rose-200">{error}</div>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs font-medium text-slate-300">Underground / Wall</Label>
            <Input
              inputMode="numeric"
              className="mt-1 border-white/10 bg-white/[0.04] text-white backdrop-blur-xl focus:border-emerald-400/40"
              value={rates?.underground ?? ""}
              onChange={(e) => setRates((r) => ({ ...(r || { underground: 125, open_pvc: 70, open_wire: 50 }), underground: safeNum(e.target.value) }))}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-300">Open Type (PVC Casing)</Label>
            <Input
              inputMode="numeric"
              className="mt-1 border-white/10 bg-white/[0.04] text-white backdrop-blur-xl focus:border-emerald-400/40"
              value={rates?.open_pvc ?? ""}
              onChange={(e) => setRates((r) => ({ ...(r || { underground: 125, open_pvc: 70, open_wire: 50 }), open_pvc: safeNum(e.target.value) }))}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-300">Open Wire (Wire Clamp)</Label>
            <Input
              inputMode="numeric"
              className="mt-1 border-white/10 bg-white/[0.04] text-white backdrop-blur-xl focus:border-emerald-400/40"
              value={rates?.open_wire ?? ""}
              onChange={(e) => setRates((r) => ({ ...(r || { underground: 125, open_pvc: 70, open_wire: 50 }), open_wire: safeNum(e.target.value) }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onSave}
            disabled={saving || !rates}
            className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 shadow-[0_0_16px_rgba(52,211,153,0.12)] backdrop-blur-xl transition-all duration-200 hover:bg-emerald-500/25 hover:border-emerald-400/50 active:scale-95 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Rates"}
          </Button>
          {savedOk && <span className="text-xs text-emerald-300">Saved</span>}
          {saveError && <span className="text-xs text-rose-200">{saveError}</span>}
        </div>
      </div>
    </section>
  );
}
