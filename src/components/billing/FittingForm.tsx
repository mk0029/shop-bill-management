"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { useFittingRates } from "@/components/billing/fitting-calculator";

export type FittingCategoryKey = "underground" | "open_pvc" | "open_wire";

const CATEGORY_OPTIONS: { value: FittingCategoryKey; label: string }[] = [
  { value: "underground", label: "Underground / Wall Fitting" },
  { value: "open_pvc", label: "Open Type (PVC Casing)" },
  { value: "open_wire", label: "Open Wire (Wire Clamp)" },
];

function safeInt(n: number | string | undefined | null): number {
  const x = typeof n === "string" ? Number(n) : n;
  return Number.isFinite(x) && (x as number) >= 0 ? Math.floor(x as number) : 0;
}

export interface FittingComponentCfg {
  key: string;
  label: string;
  pointsPerUnit: number;
  order?: number;
}

export default function FittingForm({
  onAddItem,
  onSubmitted,
}: {
  onAddItem: (item: {
    productName: string;
    quantity: number;
    unitPrice: number;
    specifications?: string;
    category?: string;
    brand?: string;
    unit?: string;
  }) => void;
  onSubmitted?: () => void;
}) {
  const { rates, loading: ratesLoading, error: ratesError } = useFittingRates();
  const [category, setCategory] = useState<FittingCategoryKey>("underground");
  const [components, setComponents] = useState<FittingComponentCfg[]>([]);
  // Store inputs as strings so the fields can be empty instead of defaulting to 0
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [errorCfg, setErrorCfg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingCfg(true);
      setErrorCfg(null);
      try {
        const res = await fetch("/api/fitting-config", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || json?.success === false) throw new Error(json?.error || `Failed (${res.status})`);
        const list: FittingComponentCfg[] = (json?.data?.components || json?.components || []).slice().sort((a: FittingComponentCfg, b: FittingComponentCfg) => (a?.order ?? 0) - (b?.order ?? 0));
        if (mounted) {
          setComponents(list);
          // initialize inputs state keys
          const init: Record<string, string> = {};
          list.forEach((c) => { init[c.key] = ""; });
          // Extra charge fields (do not affect points directly)
          init["earthingCharge"] = "";
          init["inverterFittingCharge"] = "";
          setInputs(init);
        }
      } catch (e: any) {
        if (mounted) setErrorCfg(e?.message || "Failed to load fitting config");
      } finally { if (mounted) setLoadingCfg(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const points = useMemo(() => {
    return components.reduce((sum, c) => sum + safeInt(inputs[c.key]) * (c.pointsPerUnit || 0), 0);
  }, [components, inputs]);

  const rate = useMemo(() => (rates ? rates[category] || 0 : 0), [rates, category]);
  // Extra charge amounts
  const earthingCharge = useMemo(() => safeInt(inputs["earthingCharge"]), [inputs]);
  const inverterFittingCharge = useMemo(() => safeInt(inputs["inverterFittingCharge"]), [inputs]);
  const amount = useMemo(() => points * rate + earthingCharge + inverterFittingCharge, [points, rate, earthingCharge, inverterFittingCharge]);

  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // Keep raw string for controlled input; calculations use safeInt
    setInputs((prev) => ({ ...prev, [key]: v }));
  };

  const onSubmit = () => {
    if (amount <= 0) return;
    const breakdownList: string[] = components
      .map((c) => `${c.label}: ${safeInt(inputs[c.key])} × ${c.pointsPerUnit}`)
      .filter((s) => !/\b0 ×/.test(s));
    if (earthingCharge > 0) breakdownList.push(`Earthing Charge: ₹${earthingCharge}`);
    if (inverterFittingCharge > 0) breakdownList.push(`Inverter Fitting Charge: ₹${inverterFittingCharge}`);
    const breakdown = breakdownList.join(", ");
    const specs = `${breakdown} | Points: ${points} | Rate: ₹${rate}/pt`;
    onAddItem({
      productName: `Fitting/Wiring - ${CATEGORY_OPTIONS.find((o) => o.value === category)?.label || category}`,
      quantity: 1,
      unitPrice: amount,
      specifications: specs,
      category: "Fitting/Wiring Service",
      brand: "Custom",
      unit: "service",
    });
    // reset counts but keep category
    const reset: Record<string, string> = {};
    components.forEach((c) => { reset[c.key] = ""; });
    reset["earthingCharge"] = "";
    reset["inverterFittingCharge"] = "";
    setInputs(reset);
    onSubmitted?.();
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Fitting/Wiring Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-gray-300">
        <div>
          <Label className="text-gray-200">Fitting Category</Label>
          <div className="mt-1">
            <Dropdown
              options={CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: `${o.label} ${rates ? `(₹${rates[o.value]}/pt)` : ""}` }))}
              value={category}
              onValueChange={(v) => setCategory(v as FittingCategoryKey)}
              placeholder="Select category"
              className="w-full"
              searchable={false}
            />
          </div>
        </div>

        {loadingCfg && <div className="text-gray-400 text-sm">Loading components...</div>}
        {errorCfg && <div className="text-red-400 text-sm">{errorCfg}</div>}
        {ratesLoading && <div className="text-gray-400 text-sm">Loading rates...</div>}
        {ratesError && <div className="text-red-400 text-sm">{ratesError}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {components.map((c) => (
            <div key={c.key}>
              <Label>{c.label}</Label>
              <Input inputMode="numeric" className="bg-gray-800 border-gray-700 text-white mt-1" value={inputs[c.key] ?? ""} onChange={setField(c.key)} />
            </div>
          ))}
          {/* Extra charges */}
          <div>
            <Label>Earthing Charge (₹)</Label>
            <Input inputMode="numeric" className="bg-gray-800 border-gray-700 text-white mt-1" value={inputs["earthingCharge"] ?? ""} onChange={setField("earthingCharge")} />
          </div>
          <div>
            <Label>Inverter Fitting Charge (₹)</Label>
            <Input inputMode="numeric" className="bg-gray-800 border-gray-700 text-white mt-1" value={inputs["inverterFittingCharge"] ?? ""} onChange={setField("inverterFittingCharge")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="bg-gray-800 border-gray-700"><CardContent className="p-4"><div className="text-gray-400 text-sm">Total Points</div><div className="text-2xl font-bold text-white">{points}</div></CardContent></Card>
          <Card className="bg-gray-800 border-gray-700"><CardContent className="p-4"><div className="text-gray-400 text-sm">Rate (₹/pt)</div><div className="text-2xl font-bold text-white">{rate}</div></CardContent></Card>
          <Card className="bg-gray-800 border-gray-700"><CardContent className="p-4"><div className="text-gray-400 text-sm">Total Amount (₹)</div><div className="text-2xl font-bold text-white">{amount}</div><div className="text-xs text-gray-400 mt-1">Includes extra charges</div></CardContent></Card>
        </div>

        <div className="pt-2">
          <Button className="bg-blue-600 hover:bg-blue-500" onClick={onSubmit} disabled={amount <= 0}>Add to Bill</Button>
        </div>
      </CardContent>
    </Card>
  );
}
