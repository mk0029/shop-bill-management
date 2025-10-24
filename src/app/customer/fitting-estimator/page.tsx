"use client";

import React from "react";
import { FittingCalculator } from "@/components/billing/fitting-calculator";

export default function CustomerFittingEstimatorPage() {
  return (
    <div className="space-y-4">
      <FittingCalculator allowGenerate={false} showHeader={true} adminRatesEditor={false} />
    </div>
  );
}
