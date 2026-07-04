import React from "react";
import { Calculator } from "lucide-react";
import { useLocaleStore } from "@/store/locale-store";

interface BillSummaryProps {
  subtotal: number;
  visitingCharges: number;
  total: number;
}

export function BillSummary({
  subtotal,
  visitingCharges,
  total,
}: BillSummaryProps) {
  const { currency } = useLocaleStore();

  return (
    <div className="p-3 sm:p-4 bg-gray-800 rounded-lg border border-gray-700">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-2 md:mb-3 flex items-center gap-2">
        <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
        Bill Summary
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between text-gray-300 text-sm sm:text-base">
          <span>Subtotal</span>
          <span>
            {currency}
            {subtotal.toLocaleString()}
          </span>
        </div>
        {visitingCharges > 0 && (
          <div className="flex justify-between text-gray-300 text-sm sm:text-base">
            <span>Visiting Charges</span>
            <span>
              {currency}
              {visitingCharges}
            </span>
          </div>
        )}
        <div className="border-t border-gray-700 pt-2">
          <div className="flex justify-between text-white font-bold text-base sm:text-lg">
            <span>Total</span>
            <span>
              {currency}
              {total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillSummary;
