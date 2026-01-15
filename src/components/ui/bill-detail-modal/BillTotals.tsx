"use client";

import { AnimatePresence, motion } from "framer-motion";

interface BillTotalsProps {
  bill: any;
  currency: string;
  grandTotal: number;
  existingDiscountTotal: number;
  discountAmount: string;
  toNum: (v: any) => number;
}

export const BillTotals = ({
  bill,
  currency,
  grandTotal,
  existingDiscountTotal,
  discountAmount,
  toNum,
}: BillTotalsProps) => {
  return (
    <div className="border-t border-gray-700 pt-3 sm:pt-4 md:pt-6">
      <div className="space-y-3">
        <div className="flex justify-between items-center text-base sm:text-lg md:text-xl font-bold">
          <span className="text-white">Total Amount</span>
          <span className="text-white">
            {currency}
            {grandTotal?.toFixed(2) || bill?.balanceAmount}
          </span>
        </div>

        {/* Show Discount row (existing + currently entered, for live preview) */}
        {(() => {
          const liveAdd = Math.max(Number(discountAmount || 0), 0);
          const totalDiscountShow = existingDiscountTotal + liveAdd;
          return totalDiscountShow > 0 ? (
            <div className="flex justify-between items-center sm:text-base text-sm">
              <span className="text-gray-300">Discount</span>
              <span className="text-red-300 font-medium">
                -{currency}
                {totalDiscountShow.toFixed(2)}
              </span>
            </div>
          ) : null;
        })()}

        <AnimatePresence>
          {bill.paymentStatus === "partial" && (
            <motion.div
              key="partial-status-breakdown"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-1 sm:space-y-2 pt-2 border-t border-gray-800"
            >
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-green-400">Paid Amount</span>
                <span className="text-green-400 font-medium">
                  {currency}
                  {toNum(bill.paidAmount || 0).toFixed(2)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(() => {
          const liveAdd = Math.max(Number(discountAmount || 0), 0);
          const paidAmount =
            bill.paymentStatus === "partial" ? toNum(bill.paidAmount || 0) : 0;
          const net = Math.max(
            0,
            grandTotal - (existingDiscountTotal + liveAdd) - paidAmount
          );
          return (
            <div className="flex justify-between items-center text-sm sm:text-base font-semibold">
              <span className="text-gray-200">Net Payable</span>
              <span className="text-white">
                {currency}
                {net.toFixed(2)}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
