"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";
import { useSettingsStore } from "@/store/settings-store";

export default function AdminBillingDefaultsSection() {
  const homeVisitFeeDefault = useSettingsStore((s) => s.homeVisitFeeDefault);
  const repairFeeDefault = useSettingsStore((s) => s.repairFeeDefault);
  const offlineAutoUploadDefault = useSettingsStore(
    (s) => s.offlineAutoUploadDefault,
  );
  const setDefaults = useSettingsStore((s) => s.setDefaults);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="border-b border-white/5 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-slate-100">Billing Defaults</h2>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <div className="text-sm font-medium text-slate-100">Service Fees</div>
            <div className="mt-0.5 text-xs text-slate-400">
              Set default amounts applied when creating new bills. You can still
              override them per bill.
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="homeVisitFee" className="text-xs font-medium text-slate-300">Home Visit Fee (₹)</Label>
            <Input
              id="homeVisitFee"
              inputMode="numeric"
              className="mt-1 border-white/10 bg-white/[0.04] text-white backdrop-blur-xl focus:border-emerald-400/40"
              value={homeVisitFeeDefault}
              onChange={(e) =>
                setDefaults({
                  homeVisitFeeDefault: Number(e.target.value) || 0,
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="repairFee" className="text-xs font-medium text-slate-300">Repair Fee (₹)</Label>
            <Input
              id="repairFee"
              inputMode="numeric"
              className="mt-1 border-white/10 bg-white/[0.04] text-white backdrop-blur-xl focus:border-emerald-400/40"
              value={repairFeeDefault}
              onChange={(e) =>
                setDefaults({ repairFeeDefault: Number(e.target.value) || 0 })
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-slate-100">
              Auto-upload when online
            </div>
            <div className="text-xs text-slate-400">
              When offline, bills are saved locally and auto-uploaded on
              reconnect.
            </div>
          </div>
          <Switch
            checked={!!offlineAutoUploadDefault}
            onCheckedChange={(v) =>
              setDefaults({ offlineAutoUploadDefault: !!v })
            }
          />
        </div>
      </div>
    </section>
  );
}
