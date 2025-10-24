"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";

export type FittingCategoryKey = "underground" | "open_pvc" | "open_wire";

export type FittingRates = {
  underground: number;
  open_pvc: number;
  open_wire: number;
};

export interface FittingRatesDoc {
  _id: "fittingRates";
  _type: "fitting_rates";
  rates: FittingRates;
  updatedAt: string;
}

const CATEGORY_OPTIONS: { value: FittingCategoryKey; label: string }[] = [
  { value: "underground", label: "Underground / Wall Fitting" },
  { value: "open_pvc", label: "Open Type (PVC Casing)" },
  { value: "open_wire", label: "Open Wire (Wire Clamp)" },
];

function safeNum(n: number | string): number {
  const x = typeof n === "string" ? Number(n) : n;
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
}

export type CalculatorInputs = {
  switches: number;
  regulators: number;
  mcb: number;
  rccb: number;
  indicators: number;
  tvSockets: number;
};

const DEFAULT_INPUTS: CalculatorInputs = {
  switches: 0,
  regulators: 0,
  mcb: 0,
  rccb: 0,
  indicators: 0,
  tvSockets: 0,
};

export function useFittingRates() {
  const [rates, setRates] = useState<FittingRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/fitting-rates", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || json?.success === false) {
          throw new Error(json?.error || `Failed (${res.status})`);
        }
        const r: FittingRates = json?.data?.rates ?? json?.rates ?? null;
        if (mounted) setRates(r);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load rates");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { rates, loading, error, setRates } as const;
}

export function FittingCalculator({
  allowGenerate = true,
  showHeader = true,
  adminRatesEditor = false,
}: {
  allowGenerate?: boolean;
  showHeader?: boolean;
  adminRatesEditor?: boolean; // show rate edit inputs + save
}) {
  const { rates, loading, error, setRates } = useFittingRates();
  const [category, setCategory] = useState<FittingCategoryKey>("underground");
  const [inputs, setInputs] = useState<CalculatorInputs>({ ...DEFAULT_INPUTS });
  const [savingRates, setSavingRates] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const points = useMemo(() => {
    const s = safeNum(inputs.switches);
    const r = safeNum(inputs.regulators);
    const i = safeNum(inputs.indicators);
    const tv = safeNum(inputs.tvSockets);
    const m = safeNum(inputs.mcb) * 2; // 2 points each
    const rc = safeNum(inputs.rccb) * 2; // 2 points each
    return s + r + i + tv + m + rc;
  }, [inputs]);

  const rate = useMemo(() => {
    if (!rates) return 0;
    return rates[category] || 0;
  }, [rates, category]);

  const amount = useMemo(() => points * rate, [points, rate]);

  const setField = (key: keyof CalculatorInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = safeNum(e.target.value);
    setInputs((prev) => ({ ...prev, [key]: v }));
  };

  const onSaveRates = async () => {
    if (!adminRatesEditor || !rates) return;
    setSavingRates(true);
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
      setSavingRates(false);
    }
  };

  return (
    <div className="space-y-4">
      {showHeader && (
        <h2 className="text-xl font-semibold text-white">Fitting/Wiring Bill</h2>
      )}

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-300">
          {/* Category */}
          <div>
            <Label className="text-gray-200">Fitting Category</Label>
            <div className="mt-1">
              <Dropdown
                options={CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: `${o.label} (₹${rates ? rates[o.value] : "-"}/pt)` }))}
                value={category}
                onValueChange={(v) => setCategory(v as FittingCategoryKey)}
                placeholder="Select category"
                className="w-full"
                searchable={false}
              />
            </div>
          </div>

          {/* Inputs grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label>Switches</Label>
              <Input inputMode="numeric" className="bg-gray-800 border-gray-700 text-white mt-1" value={inputs.switches}
                onChange={setField("switches")} />
            </div>
            <div>
              <Label>Fan Regulators</Label>
              <Input inputMode="numeric" className="bg-gray-800 border-gray-700 text-white mt-1" value={inputs.regulators}
                onChange={setField("regulators")} />
            </div>
            <div>
              <Label>MCB</Label>
              <Input inputMode="numeric" className="bg-gray-800 border-gray-700 text-white mt-1" value={inputs.mcb}
                onChange={setField("mcb")} />
            </div>
            <div>
              <Label>RCCB</Label>
              <Input inputMode="numeric" className="bg-gray-800 border-gray-700 text-white mt-1" value={inputs.rccb}
                onChange={setField("rccb")} />
            </div>
            <div>
              <Label>Indicators</Label>
              <Input inputMode="numeric" className="bg-gray-800 border-gray-700 text-white mt-1" value={inputs.indicators}
                onChange={setField("indicators")} />
            </div>
            <div>
              <Label>TV Sockets</Label>
              <Input inputMode="numeric" className="bg-gray-800 border-gray-700 text-white mt-1" value={inputs.tvSockets}
                onChange={setField("tvSockets")} />
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="text-gray-400 text-sm">Total Points</div>
                <div className="text-2xl font-bold text-white">{points}</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="text-gray-400 text-sm">Rate (₹/pt)</div>
                <div className="text-2xl font-bold text-white">{rate}</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="text-gray-400 text-sm">Total Amount (₹)</div>
                <div className="text-2xl font-bold text-white">{amount}</div>
              </CardContent>
            </Card>
          </div>

          {allowGenerate && (
            <div className="pt-2">
              <Button className="bg-blue-600 hover:bg-blue-500">Generate Bill</Button>
            </div>
          )}

          {/* Rates editor for Admin */}
          {adminRatesEditor && (
            <div className="pt-4 space-y-3">
              <div className="text-gray-200 font-medium">Rates (₹ per point)</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Underground / Wall</Label>
                  <Input inputMode="numeric" className="bg-gray-800 border-gray-700 text-white mt-1" value={rates?.underground ?? ""}
                    onChange={(e) => setRates((r) => ({ ...(r || { underground: 125, open_pvc: 70, open_wire: 50 }), underground: safeNum(e.target.value) }))} />
                </div>
                <div>
                  <Label>Open Type (PVC Casing)</Label>
                  <Input inputMode="numeric" className="bg-gray-800 border-gray-700 text-white mt-1" value={rates?.open_pvc ?? ""}
                    onChange={(e) => setRates((r) => ({ ...(r || { underground: 125, open_pvc: 70, open_wire: 50 }), open_pvc: safeNum(e.target.value) }))} />
                </div>
                <div>
                  <Label>Open Wire (Wire Clamp)</Label>
                  <Input inputMode="numeric" className="bg-gray-800 border-gray-700 text-white mt-1" value={rates?.open_wire ?? ""}
                    onChange={(e) => setRates((r) => ({ ...(r || { underground: 125, open_pvc: 70, open_wire: 50 }), open_wire: safeNum(e.target.value) }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={onSaveRates} disabled={savingRates} className="bg-green-600 hover:bg-green-500">
                  {savingRates ? "Saving..." : "Save Rates"}
                </Button>
                {savedOk && <span className="text-green-400 text-sm">Saved</span>}
                {saveError && <span className="text-red-400 text-sm">{saveError}</span>}
              </div>
            </div>
          )}

          {/* Loading / Error */}
          {loading && <div className="text-gray-400 text-sm">Loading rates...</div>}
          {error && <div className="text-red-400 text-sm">{error}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
