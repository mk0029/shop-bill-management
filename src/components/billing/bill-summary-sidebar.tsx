/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useOnline } from "../../hooks/use-online";
import { useRef } from "react";
import { useLocaleStore } from "../../store/locale-store";
import { isStandalone } from "../../lib/pwa";
import { CreditCard, DollarSign, Save, Wallet, WifiOff } from "lucide-react";
import { Label } from "@radix-ui/react-label";
import { Switch } from "@radix-ui/react-switch";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

interface BillSummarySidebarProps {
  selectedCustomer: any;
  selectedItems: any[];
  formData: any;
  calculateTotal: () => number;
  calculateGrandTotal: () => number;
  getPaymentDetails: () => {
    paymentStatus: "pending" | "partial" | "paid";
    paidAmount: number;
    balanceAmount: number;
  };
  onInputChange: (field: string, value: unknown) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onSaveDraft: () => void;
  savingDraft: boolean;
}

export const BillSummarySidebar = ({
  selectedCustomer,
  selectedItems,
  formData,
  calculateTotal,
  calculateGrandTotal,
  getPaymentDetails,
  onInputChange,
  onSubmit,
  isLoading,
  onSaveDraft,
  savingDraft,
}: BillSummarySidebarProps) => {
  const { currency } = useLocaleStore();
  const online = useOnline();
  const installed = typeof window !== "undefined" ? isStandalone() : false;
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const itemsTotal = calculateTotal();
  const grandTotal = calculateGrandTotal();
  const paymentDetails = getPaymentDetails();

  return (
    <Card className="bg-gray-900 border-gray-800 sticky top-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Bill Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedCustomer && (
          <div className="p-3 bg-gray-800 rounded-lg">
            <h4 className="font-medium text-white mb-2">Customer</h4>
            <p className="text-gray-300">{selectedCustomer.name}</p>
            <p className="text-sm text-gray-400">{selectedCustomer.phone}</p>
            {selectedCustomer.email && (
              <p className="text-sm text-gray-400">{selectedCustomer.email}</p>
            )}
            <p className="text-sm text-gray-400">{selectedCustomer.location}</p>
          </div>
        )}

        {/* Offline behavior (only when installed) */}
        {installed && !online && (
          <div className="space-y-3 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h4 className="font-medium text-white flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-orange-400" />
              Offline Mode
            </h4>
            <div className="flex items-center justify-between">
              <Label
                htmlFor="offline-auto-upload"
                className="text-sm text-gray-300"
              >
                Auto-upload when online
              </Label>
              <Switch
                id="offline-auto-upload"
                checked={!!formData.offlineAutoUpload}
                onCheckedChange={(checked) =>
                  onInputChange("offlineAutoUpload", checked)
                }
              />
            </div>
            <p className="text-xs text-gray-400">
              You&apos;re offline. Bills created now will{" "}
              {formData.offlineAutoUpload
                ? "be queued and uploaded automatically when you're back online."
                : "be saved as drafts locally."}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">
              Items ({selectedItems.length})
            </span>
            <span className="text-white">
              {currency}
              {itemsTotal.toFixed(2)}
            </span>
          </div>

          {formData.repairFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Repair Charges</span>
              <span className="text-white">
                {currency}
                {Number(formData.repairFee).toFixed(2)}
              </span>
            </div>
          )}

          {formData.homeVisitFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Home Visit Fee</span>
              <span className="text-white">
                {currency}
                {Number(formData.homeVisitFee).toFixed(2)}
              </span>
            </div>
          )}

          {/* Discount input */}

          <div className="border-t border-gray-700 pt-3">
            <div className="flex justify-between font-semibold">
              <span className="text-white">Total</span>
              <span className="text-blue-400 text-lg">
                {currency}
                {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Controls */}
        <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="font-medium text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payment Options
          </h4>

          {/* 3-position slider: Pending (0) • Partial (1) • Paid (2) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">
                  Payment Mode{" "}
                  <span
                    className={
                      formData.isMarkAsPaid
                        ? "text-green-400"
                        : formData.enablePartialPayment
                          ? "text-yellow-600"
                          : "text-yellow-400"
                    }
                  >
                    {formData.isMarkAsPaid
                      ? "Paid"
                      : formData.enablePartialPayment
                        ? "Partial"
                        : "Pending"}
                  </span>
                </span>
              </div>
              {(() => {
                const paymentIndex = formData.isMarkAsPaid
                  ? 2
                  : formData.enablePartialPayment
                    ? 1
                    : 0;
                const setIndex = (idx: 0 | 1 | 2) => {
                  if (idx === 0) {
                    onInputChange("isMarkAsPaid", false);
                    onInputChange("enablePartialPayment", false);
                    onInputChange("partialPaymentAmount", 0);
                  } else if (idx === 1) {
                    onInputChange("enablePartialPayment", true);
                  } else if (idx === 2) {
                    onInputChange("isMarkAsPaid", true);
                  }
                };
                const stepWidth = 25.5; // px
                const knobLeft = paymentIndex * stepWidth + 2; // 0->2px, 1->38px, 2->74px
                const handlePointerAt = (clientX: number) => {
                  const el = sliderRef.current;
                  if (!el) return;
                  const rect = el.getBoundingClientRect();
                  const ratio = Math.min(
                    1,
                    Math.max(0, (clientX - rect.left) / rect.width),
                  );
                  const idx = Math.round(ratio * 2) as 0 | 1 | 2;
                  setIndex(idx);
                };
                const startMouseDrag = (e: React.MouseEvent) => {
                  e.preventDefault();
                  handlePointerAt(e.clientX);
                  const onMove = (ev: MouseEvent) =>
                    handlePointerAt(ev.clientX);
                  const onUp = () => {
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                  };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                };
                const startTouchDrag = (e: React.TouchEvent) => {
                  const t = e.touches[0];
                  if (!t) return;
                  handlePointerAt(t.clientX);
                  const onMove = (ev: TouchEvent) => {
                    const tt = ev.touches[0];
                    if (tt) handlePointerAt(tt.clientX);
                  };
                  const onUp = () => {
                    window.removeEventListener("touchmove", onMove);
                    window.removeEventListener("touchend", onUp);
                    window.removeEventListener("touchcancel", onUp);
                  };
                  window.addEventListener("touchmove", onMove);
                  window.addEventListener("touchend", onUp);
                  window.addEventListener("touchcancel", onUp);
                };
                return (
                  <div className="flex items-center pb-3 relative">
                    <div
                      role="slider"
                      aria-label="Payment mode"
                      aria-valuemin={0}
                      aria-valuemax={2}
                      aria-valuenow={paymentIndex}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowRight") {
                          e.preventDefault();
                          const nextRight = Math.min(2, paymentIndex + 1) as
                            | 0
                            | 1
                            | 2;
                          setIndex(nextRight);
                        } else if (e.key === "ArrowLeft") {
                          e.preventDefault();
                          const nextLeft = Math.max(0, paymentIndex - 1) as
                            | 0
                            | 1
                            | 2;
                          setIndex(nextLeft);
                        }
                      }}
                      onMouseDown={startMouseDrag}
                      onTouchStart={startTouchDrag}
                      ref={sliderRef}
                      className={`relative w-20 h-7 rounded-full border border-gray-500/60 bg-slate-700/40 backdrop-blur-sm transition-colors duration-200 outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      {/* segments */}
                      <div className="absolute inset-0 grid grid-cols-3">
                        <button
                          type="button"
                          className="col-span-1"
                          onClick={() => setIndex(0)}
                          aria-label="Pending"
                        />
                        <button
                          type="button"
                          className="col-span-1"
                          onClick={() => setIndex(1)}
                          aria-label="Partial"
                        />
                        <button
                          type="button"
                          className="col-span-1"
                          onClick={() => setIndex(2)}
                          aria-label="Paid"
                        />
                      </div>
                      {/* knob */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-sm transition-all duration-200 ease-out ${paymentIndex === 2 ? "bg-green-300" : paymentIndex === 1 ? "bg-amber-300" : "bg-slate-300"}`}
                        style={{ left: knobLeft }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Partial Payment Input (visible when partial mode) */}
          {!formData.isMarkAsPaid && formData.enablePartialPayment && (
            <div className="space-y-2">
              <Label htmlFor="partial-amount" className="text-xs text-gray-400">
                Amount Received
              </Label>
              <Input
                id="partial-amount"
                type="number"
                max={grandTotal}
                placeholder="0"
                step="1"
                value={
                  formData.partialPaymentAmount > 0
                    ? formData.partialPaymentAmount
                    : ""
                }
                onChange={(e) =>
                  onInputChange(
                    "partialPaymentAmount",
                    (e.target as HTMLInputElement).value,
                  )
                }
                className="bg-gray-900 border-gray-600 text-white focus-visible:ring-1 focus-visible:ring-blue-500"
              />
              {Number(formData.partialPaymentAmount) > 0 && (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>Paid:</span>
                    <span className="text-green-400">
                      {currency}
                      {paymentDetails.paidAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Pending:</span>
                    <span className="text-orange-400">
                      {currency}
                      {paymentDetails.balanceAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bill-discount" className="text-xs text-gray-400">
            Discount
          </Label>
          <Input
            id="bill-discount"
            type="number"
            step="1"
            value={formData.discount > 0 ? formData.discount : ""}
            onChange={(e) =>
              onInputChange("discount", (e.target as HTMLInputElement).value)
            }
            placeholder="0"
            className="bg-gray-900 border-gray-600 text-white focus-visible:ring-1 focus-visible:ring-blue-500"
          />
        </div>

        {/* Discount summary line */}
        {Number(formData.discount) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Discount</span>
            <span className="text-red-400">
              -{currency}
              {Number(formData.discount).toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onSaveDraft}
            disabled={savingDraft || isLoading || !formData.customerId}
            className="w-full sm:flex-1 border-gray-700 text-white hover:bg-gray-800"
          >
            {savingDraft ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving Draft...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save as Draft
              </div>
            )}
          </Button>{" "}
          <Button
            onClick={onSubmit}
            disabled={isLoading || !formData.customerId}
            className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Bill...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {!online && installed && formData.offlineAutoUpload
                  ? "Queue Bill"
                  : "Create Bill"}
              </div>
            )}
          </Button>
        </div>

        {/* {selectedItems.length === 0 && (
          <p className="text-xs text-gray-400 text-center">
            Add items to create bill
          </p>
        )} */}
      </CardContent>
    </Card>
  );
};
