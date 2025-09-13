"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";
import { useSettingsStore } from "@/store/settings-store";

export default function AdminBillingDefaultsSection() {
  const homeVisitFeeDefault = useSettingsStore((s) => s.homeVisitFeeDefault);
  const laborChargesDefault = useSettingsStore((s) => s.laborChargesDefault);
  const repairFeeDefault = useSettingsStore((s) => s.repairFeeDefault);
  const offlineAutoUploadDefault = useSettingsStore((s) => s.offlineAutoUploadDefault);
  const setDefaults = useSettingsStore((s) => s.setDefaults);

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          Billing Defaults
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-300">
        <div className="flex items-start gap-2 rounded-md bg-gray-800 p-3">
          <Info className="h-4 w-4 mt-0.5 text-gray-400" />
          <div>
            <div className="text-gray-200 font-medium">Service Fees</div>
            <div className="text-gray-400">Set default amounts applied when creating new bills. You can still override them per bill.</div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="homeVisitFee">Home Visit Fee (₹)</Label>
            <Input
              id="homeVisitFee"
              inputMode="numeric"
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={homeVisitFeeDefault}
              onChange={(e) => setDefaults({ homeVisitFeeDefault: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="laborCharges">Labor Charges (₹)</Label>
            <Input
              id="laborCharges"
              inputMode="numeric"
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={laborChargesDefault}
              onChange={(e) => setDefaults({ laborChargesDefault: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="repairFee">Repair Fee (₹)</Label>
            <Input
              id="repairFee"
              inputMode="numeric"
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={repairFeeDefault}
              onChange={(e) => setDefaults({ repairFeeDefault: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="rounded-md bg-gray-800 p-3 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-gray-200 font-medium">Auto-upload when online</div>
            <div className="text-gray-400">When offline, bills are saved locally and auto-uploaded on reconnect.</div>
          </div>
          <Switch
            checked={!!offlineAutoUploadDefault}
            onCheckedChange={(v) => setDefaults({ offlineAutoUploadDefault: !!v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
