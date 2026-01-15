"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Edit3, CheckCircle2, Save } from "lucide-react";

interface PaymentControlsProps {
  isEditingPayment: boolean;
  setIsEditingPayment: (value: boolean) => void;
  paymentMode: "paid" | "partial";
  setPaymentMode: (mode: "paid" | "partial") => void;
  partialAmount: string;
  setPartialAmount: (value: string) => void;
  discountAmount: string;
  setDiscountAmount: (value: string) => void;
  isUpdatingPayment: boolean;
  grandTotal: number;
  getEffectiveGrandTotal: () => number;
  toNum: (v: any) => number;
  bill: any;
  handlePaymentUpdate: () => void;
  currency: string;
}

export const PaymentControls = ({
  isEditingPayment,
  setIsEditingPayment,
  paymentMode,
  setPaymentMode,
  partialAmount,
  setPartialAmount,
  discountAmount,
  setDiscountAmount,
  isUpdatingPayment,
  grandTotal,
  getEffectiveGrandTotal,
  toNum,
  bill,
  handlePaymentUpdate,
  currency,
}: PaymentControlsProps) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-2 sm:py-2 sm:px-3 border border-gray-700">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-white flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Update Payment
        </h3>
        {!isEditingPayment && (
          <button
            onClick={() => setIsEditingPayment(true)}
            className="text-sm font-normal leading-none p-2 rounded-md border border-solid border-slate-300"
          >
            <Edit3 className="size-3 md:size-4" />
          </button>
        )}
      </div>

      {isEditingPayment && (
        <div className="space-y-4">
          <div className="flex gap-2 items-center mt-2">
            <p className="text-base font-normal leading-none">Mark Full Paid</p>
            <div
              onClick={() =>
                setPaymentMode(paymentMode === "paid" ? "partial" : "paid")
              }
              className={`w-10 h-6 cursor-pointer rounded-full border border-solid relative ${
                paymentMode === "paid" ? "border-green-300" : "border-slate-300"
              }`}
            >
              <div
                className={`w-4 h-4 transition-all ease-linear duration-100 rounded-full absolute top-1/2 -translate-x-0 -translate-y-1/2
                ${paymentMode === "partial" ? "left-0.5 bg-slate-300" : "left-5 bg-green-300"}`}
              ></div>
            </div>
            <p className="text-sm font-normal leading-none">
              {paymentMode === "paid" ? "Paid" : "Partial"}
            </p>
          </div>

          {/* Partial amount controls */}
          <AnimatePresence initial={false}>
            {paymentMode === "partial" && (
              <motion.div
                key="partial-controls"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-3 overflow-hidden"
              >
                <div>
                  <Label
                    htmlFor="partial-amount"
                    className="text-xs text-gray-400"
                  >
                    Amount Received
                  </Label>
                  <Input
                    id="partial-amount"
                    type="number"
                    min="0"
                    max={grandTotal}
                    step="1"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="0"
                    className="bg-gray-900 border-gray-600 text-white"
                  />
                  {paymentMode === "partial" &&
                    (!partialAmount || Number(partialAmount) <= 0) && (
                      <p className="mt-1 text-xs text-gray-400">
                        Enter an amount greater than 0 to enable Save.
                      </p>
                    )}
                </div>

                {/* Live summary */}
                <AnimatePresence>
                  {Number(partialAmount) >= 0 && partialAmount !== "" && (
                    <motion.div
                      key="partial-summary"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="space-y-1 overflow-hidden"
                    >
                      <div className="flex justify-between text-gray-400 text-sm">
                        <span>Already paid:</span>
                        <span className="text-green-400">
                          {currency}
                          {toNum(bill.paidAmount || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-400 text-sm">
                        <span>New total paid:</span>
                        <span className="text-green-400">
                          {currency}
                          {(() => {
                            const effectiveGrand = getEffectiveGrandTotal();
                            return Math.min(
                              toNum(bill.paidAmount || 0) +
                                Math.max(Number(partialAmount), 0),
                              effectiveGrand
                            ).toFixed(2);
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-400 text-sm">
                        <span>Will remain pending:</span>
                        <span className="text-orange-400">
                          {currency}
                          {(() => {
                            const effectiveGrand = getEffectiveGrandTotal();
                            return Math.max(
                              0,
                              effectiveGrand -
                                Math.min(
                                  toNum(bill.paidAmount || 0) +
                                    Math.max(Number(partialAmount), 0),
                                  effectiveGrand
                                )
                            ).toFixed(2);
                          })()}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Discount input (applies to both modes) */}
          {paymentMode === "partial" && (
            <div>
              <Label
                htmlFor="discount-amount"
                className="text-xs text-gray-400"
              >
                Add Discount (will be added to existing discount)
              </Label>
              <Input
                id="discount-amount"
                type="number"
                min="0"
                step="1"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0"
                className="bg-gray-900 border-gray-600 text-white"
              />
            </div>
          )}

          {/* Payment Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handlePaymentUpdate}
              disabled={
                isUpdatingPayment ||
                (paymentMode === "partial" &&
                  (!partialAmount || Number(partialAmount) <= 0) &&
                  (!discountAmount || Number(discountAmount) <= 0))
              }
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isUpdatingPayment ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {paymentMode === "paid" ? "Save (Paid)" : "Save Payment"}
                </div>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditingPayment(false);
                setPaymentMode("partial");
                setPartialAmount("");
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
