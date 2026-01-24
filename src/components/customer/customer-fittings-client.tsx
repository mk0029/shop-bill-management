"use client";

import React from "react";
import {
  FittingCalculator,
  type FittingRates,
} from "@/components/billing/fitting-calculator";

export default function CustomerFittingsClient({
  initialRates,
}: {
  initialRates?: FittingRates | null;
}) {
  return (
    <div className="space-y-4">
      <FittingCalculator
        allowGenerate={false}
        showHeader={true}
        adminRatesEditor={false}
        initialRates={initialRates}
      />
    </div>
  );
}
