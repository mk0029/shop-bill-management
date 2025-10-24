"use client";

import React from "react";
import { FittingCalculator } from "@/components/billing/fitting-calculator";

export default function AdminFittingWiringBillPage() {
  return (
    <div className="space-y-4">
      <FittingCalculator allowGenerate={true} showHeader={true} adminRatesEditor={true} />
    </div>
  );
}
