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

function safeInt(n: number | string): number {
  const x = typeof n === "string" ? Number(n) : n;
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
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
  const [inputs, setInputs] = useState<Record<string, number>>({});
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
          const init: Record<string, number> = {};
          list.forEach((c) => { init[c.key] = 0; });
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
  const amount = useMemo(() => points * rate, [points, rate]);

  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = safeInt(e.target.value);
    setInputs((prev) => ({ ...prev, [key]: v }));
  };

  const onSubmit = () => {
    if (!points || !amount) return;
    const breakdown = components
      .map((c) => `${c.label}: ${safeInt(inputs[c.key])} × ${c.pointsPerUnit}`)
      .filter((s) => !/\b0 ×/.test(s))
      .join(", ");
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
    const reset: Record<string, number> = {};
    components.forEach((c) => { reset[c.key] = 0; });
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
              <Input inputMode="numeric" className="bg-gray-800 border-gray-700 text-white mt-1" value={inputs[c.key] ?? 0} onChange={setField(c.key)} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="bg-gray-800 border-gray-700"><CardContent className="p-4"><div className="text-gray-400 text-sm">Total Points</div><div className="text-2xl font-bold text-white">{points}</div></CardContent></Card>
          <Card className="bg-gray-800 border-gray-700"><CardContent className="p-4"><div className="text-gray-400 text-sm">Rate (₹/pt)</div><div className="text-2xl font-bold text-white">{rate}</div></CardContent></Card>
          <Card className="bg-gray-800 border-gray-700"><CardContent className="p-4"><div className="text-gray-400 text-sm">Total Amount (₹)</div><div className="text-2xl font-bold text-white">{amount}</div></CardContent></Card>
        </div>

        <div className="pt-2">
          <Button className="bg-blue-600 hover:bg-blue-500" onClick={onSubmit} disabled={points <= 0 || rate <= 0}>Add to Bill</Button>
        </div>
      </CardContent>
    </Card>
  );
}
