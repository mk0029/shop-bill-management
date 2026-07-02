"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Wrench, Truck, Home, Plus } from "lucide-react";
import { GlassCard, GlassCardHeader } from "./GlassCard";
import { cn } from "@/lib/utils";

interface ChargesCardProps {
  bill: any;
  currency?: string;
}

const toNum = (v: any): number => {
  if (typeof v === "number" && isFinite(v)) return v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const chargeConfig: Record<
  string,
  { label: string; icon: any; color: string }
> = {
  transportationFee: {
    label: "Transportation Fee",
    icon: Truck,
    color: "from-sky-400/20 to-blue-500/20",
  },
  homeVisitFee: {
    label: "Home Visit Fee",
    icon: Home,
    color: "from-emerald-400/20 to-teal-500/20",
  },
  repairCharge: {
    label: "Repair Charges",
    icon: Wrench,
    color: "from-amber-400/20 to-orange-500/20",
  },
};

export const ChargesCard = memo(function ChargesCard({
  bill,
  currency = "₹",
}: ChargesCardProps) {
  const charges = useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      icon: any;
      color: string;
      value: number;
    }> = [];

    const tf = toNum(bill.transportationFee);
    if (tf > 0)
      items.push({
        key: "transportationFee",
        ...chargeConfig.transportationFee,
        value: tf,
      });

    const hvf = toNum(bill.homeVisitFee);
    if (hvf > 0)
      items.push({
        key: "homeVisitFee",
        ...chargeConfig.homeVisitFee,
        value: hvf,
      });

    const rc = toNum(
      bill.repairCharges ?? bill.repairFee ?? bill.repairCharge ?? 0,
    );
    if (rc > 0)
      items.push({
        key: "repairCharge",
        ...chargeConfig.repairCharge,
        value: rc,
      });

    return items;
  }, [bill]);

  if (!charges.length) return null;

  const total = charges.reduce((s, c) => s + c.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard>
        <GlassCardHeader title="Additional Charges" />
        <div className=" px-3 sm:px-5 md:px-6 pb-6 space-y-2.5">
          {charges.map((charge, i) => {
            const Icon = charge.icon;
            return (
              <motion.div
                key={charge.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.06] bg-gradient-to-r",
                  charge.color,
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white/60" />
                </div>
                <span className="flex-1 text-sm text-white/70">
                  {charge.label}
                </span>
                <span className="text-sm font-semibold text-white tabular-nums">
                  {currency}
                  {charge.value.toFixed(2)}
                </span>
              </motion.div>
            );
          })}

          {/* Total */}
          {charges.length > 1 && (
            <>
              <div className="glass-divider !bg-white/[0.06]" />
              <div className="flex items-center justify-between py-1 px-0.5">
                <div className="flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-sm font-medium text-white/60">
                    Total Charges
                  </span>
                </div>
                <span className="text-base font-bold text-white tabular-nums">
                  {currency}
                  {total.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
});
