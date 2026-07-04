"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { useFittingRates } from "@/components/billing/fitting-calculator";
import { Wrench } from "lucide-react";

const glassCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

const glassInnerStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "14px",
};

const glassInputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(16px)",
  borderRadius: "12px",
};

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
          const init: Record<string, string> = {};
          list.forEach((c) => { init[c.key] = ""; });
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
  const earthingCharge = useMemo(() => safeInt(inputs["earthingCharge"]), [inputs]);
  const inverterFittingCharge = useMemo(() => safeInt(inputs["inverterFittingCharge"]), [inputs]);
  const amount = useMemo(() => points * rate + earthingCharge + inverterFittingCharge, [points, rate, earthingCharge, inverterFittingCharge]);

  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs((prev) => ({ ...prev, [key]: e.target.value }));
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
    const reset: Record<string, string> = {};
    components.forEach((c) => { reset[c.key] = ""; });
    reset["earthingCharge"] = "";
    reset["inverterFittingCharge"] = "";
    setInputs(reset);
    onSubmitted?.();
  };

  return (
    <div style={glassCardStyle} className="p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <Wrench className="w-5 h-5" style={{ color: "rgba(56,189,248,0.6)" }} />
        <h3 className="text-white font-semibold text-base">Fitting/Wiring Calculator</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm text-slate-300">Fitting Category</Label>
          <Dropdown
            options={CATEGORY_OPTIONS.map((o) => ({
              value: o.value,
              label: `${o.label} ${rates ? `(₹${rates[o.value]}/pt)` : ""}`,
            }))}
            value={category}
            onValueChange={(v) => setCategory(v as FittingCategoryKey)}
            placeholder="Select category"
            searchable={false}
          />
        </div>

        {loadingCfg && <div className="text-sm" style={{ color: "rgba(148,163,184,0.5)" }}>Loading components...</div>}
        {errorCfg && <div className="text-sm text-red-400">{errorCfg}</div>}
        {ratesLoading && <div className="text-sm" style={{ color: "rgba(148,163,184,0.5)" }}>Loading rates...</div>}
        {ratesError && <div className="text-sm text-red-400">{ratesError}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {components.map((c) => (
            <div key={c.key} className="space-y-1.5">
              <Label className="text-xs text-slate-300">{c.label}</Label>
              <Input
                inputMode="numeric"
                value={inputs[c.key] ?? ""}
                onChange={setField(c.key)}
                style={glassInputStyle}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Earthing Charge (₹)</Label>
            <Input
              inputMode="numeric"
              value={inputs["earthingCharge"] ?? ""}
              onChange={setField("earthingCharge")}
              style={glassInputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Inverter Fitting Charge (₹)</Label>
            <Input
              inputMode="numeric"
              value={inputs["inverterFittingCharge"] ?? ""}
              onChange={setField("inverterFittingCharge")}
              style={glassInputStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div style={glassInnerStyle} className="p-4">
            <div className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Total Points</div>
            <div className="text-2xl font-bold text-white">{points}</div>
          </div>
          <div style={glassInnerStyle} className="p-4">
            <div className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Rate (₹/pt)</div>
            <div className="text-2xl font-bold text-white">{rate}</div>
          </div>
          <div style={glassInnerStyle} className="p-4">
            <div className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Total Amount (₹)</div>
            <div className="text-2xl font-bold text-white">{amount}</div>
            <div className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.4)" }}>Includes extra charges</div>
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={onSubmit}
            disabled={amount <= 0}
            className="gap-1.5"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(139,92,246,0.15))",
              border: "1px solid rgba(56,189,248,0.25)",
            }}
          >
            Add to Bill
          </Button>
        </div>
      </div>
    </div>
  );
}
