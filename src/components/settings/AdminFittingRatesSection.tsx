"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          Fitting/Wiring Rates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-300">
        <div className="flex items-start gap-2 rounded-md bg-gray-800 p-3">
          <Info className="h-4 w-4 mt-0.5 text-gray-400" />
          <div>
            <div className="text-gray-200 font-medium">Manage rate per point</div>
            <div className="text-gray-400">These rates are used by the Fitting/Wiring calculator and the customer estimator.</div>
          </div>
        </div>

        {loading && <div className="text-gray-400">Loading rates...</div>}
        {error && <div className="text-red-400">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Underground / Wall</Label>
            <Input
              inputMode="numeric"
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={rates?.underground ?? ""}
              onChange={(e) => setRates((r) => ({ ...(r || { underground: 125, open_pvc: 70, open_wire: 50 }), underground: safeNum(e.target.value) }))}
            />
          </div>
          <div>
            <Label>Open Type (PVC Casing)</Label>
            <Input
              inputMode="numeric"
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={rates?.open_pvc ?? ""}
              onChange={(e) => setRates((r) => ({ ...(r || { underground: 125, open_pvc: 70, open_wire: 50 }), open_pvc: safeNum(e.target.value) }))}
            />
          </div>
          <div>
            <Label>Open Wire (Wire Clamp)</Label>
            <Input
              inputMode="numeric"
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={rates?.open_wire ?? ""}
              onChange={(e) => setRates((r) => ({ ...(r || { underground: 125, open_pvc: 70, open_wire: 50 }), open_wire: safeNum(e.target.value) }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onSave} disabled={saving || !rates} className="bg-green-600 hover:bg-green-500">
            {saving ? "Saving..." : "Save Rates"}
          </Button>
          {savedOk && <span className="text-green-400 text-sm">Saved</span>}
          {saveError && <span className="text-red-400 text-sm">{saveError}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
