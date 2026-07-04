/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useOnline } from "../../hooks/use-online";
import { useRef } from "react";
import { useLocaleStore } from "../../store/locale-store";
import { isStandalone } from "../../lib/pwa";
import { CreditCard, DollarSign, Save, Wallet, WifiOff, Receipt } from "lucide-react";
import { Label } from "@radix-ui/react-label";
import { Switch } from "@radix-ui/react-switch";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { safeUserName } from "@/lib/display-text";
import { getAdminCustomerDisplayName } from "@/lib/customer-utils";

const glassCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

const glassInnerStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "14px",
};

const glassInputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(16px)",
  borderRadius: "12px",
};

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
    <div style={glassCardStyle} className="sticky top-6 overflow-hidden">
      <div className="p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Receipt className="w-5 h-5" style={{ color: "rgba(56,189,248,0.6)" }} />
          <h3 className="text-white font-semibold">Bill Summary</h3>
        </div>

        {/* Customer */}
        {selectedCustomer && (
          <div style={glassInnerStyle} className="p-3">
            <h4 className="font-medium text-white text-sm mb-1">Customer</h4>
            <p className="text-sm text-slate-300">{safeUserName(getAdminCustomerDisplayName(selectedCustomer), "Customer")}</p>
            <p className="text-xs" style={{ color: "rgba(148,163,184,0.6)" }}>{selectedCustomer.phone}</p>
            {selectedCustomer.email && (
              <p className="text-xs" style={{ color: "rgba(148,163,184,0.6)" }}>{selectedCustomer.email}</p>
            )}
            <p className="text-xs" style={{ color: "rgba(148,163,184,0.6)" }}>{selectedCustomer.location}</p>
          </div>
        )}

        {/* Offline Mode */}
        {installed && !online && (
          <div style={glassInnerStyle} className="p-4">
            <h4 className="font-medium text-white text-sm flex items-center gap-2 mb-3">
              <WifiOff className="w-4 h-4" style={{ color: "rgba(251,146,60,0.7)" }} />
              Offline Mode
            </h4>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="offline-auto-upload" className="text-sm" style={{ color: "rgba(148,163,184,0.7)" }}>
                Auto-upload when online
              </Label>
              <Switch
                id="offline-auto-upload"
                checked={!!formData.offlineAutoUpload}
                onCheckedChange={(checked) => onInputChange("offlineAutoUpload", checked)}
              />
            </div>
            <p className="text-xs" style={{ color: "rgba(148,163,184,0.4)" }}>
              {formData.offlineAutoUpload
                ? "Queued and uploaded automatically when back online."
                : "Saved as drafts locally."}
            </p>
          </div>
        )}

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span style={{ color: "rgba(148,163,184,0.6)" }}>
              Items ({selectedItems.length})
            </span>
            <span className="text-white">{currency}{itemsTotal.toFixed(2)}</span>
          </div>

          {formData.repairFee > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: "rgba(148,163,184,0.6)" }}>Repair Charges</span>
              <span className="text-white">{currency}{Number(formData.repairFee).toFixed(2)}</span>
            </div>
          )}

          {formData.visitingCharges > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: "rgba(148,163,184,0.6)" }}>Visiting Fee</span>
              <span className="text-white">{currency}{Number(formData.visitingCharges).toFixed(2)}</span>
            </div>
          )}

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} className="pt-2">
            <div className="flex justify-between font-semibold">
              <span className="text-white">Total</span>
              <span className="text-lg" style={{ color: "rgba(56,189,248,0.8)" }}>
                {currency}{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Controls */}
        <div style={glassInnerStyle} className="p-4">
          <h4 className="font-medium text-white text-sm flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4" style={{ color: "rgba(56,189,248,0.6)" }} />
            Payment Options
          </h4>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4" style={{ color: "rgba(52,211,153,0.6)" }} />
                <span className="text-sm" style={{ color: "rgba(148,163,184,0.7)" }}>
                  Payment Mode{" "}
                  <span
                    className={
                      formData.isMarkAsPaid
                        ? "text-emerald-400"
                        : formData.enablePartialPayment
                          ? "text-amber-400"
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
                const stepWidth = 25.5;
                const knobLeft = paymentIndex * stepWidth + 2;
                const handlePointerAt = (clientX: number) => {
                  const el = sliderRef.current;
                  if (!el) return;
                  const rect = el.getBoundingClientRect();
                  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
                  const idx = Math.round(ratio * 2) as 0 | 1 | 2;
                  setIndex(idx);
                };
                const startMouseDrag = (e: React.MouseEvent) => {
                  e.preventDefault();
                  handlePointerAt(e.clientX);
                  const onMove = (ev: MouseEvent) => handlePointerAt(ev.clientX);
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
                          const nextRight = Math.min(2, paymentIndex + 1) as 0 | 1 | 2;
                          setIndex(nextRight);
                        } else if (e.key === "ArrowLeft") {
                          e.preventDefault();
                          const nextLeft = Math.max(0, paymentIndex - 1) as 0 | 1 | 2;
                          setIndex(nextLeft);
                        }
                      }}
                      onMouseDown={startMouseDrag}
                      onTouchStart={startTouchDrag}
                      ref={sliderRef}
                      className="relative w-20 h-7 rounded-full border outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        borderColor: "rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.06)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <div className="absolute inset-0 grid grid-cols-3">
                        <button type="button" className="col-span-1" onClick={() => setIndex(0)} aria-label="Pending" />
                        <button type="button" className="col-span-1" onClick={() => setIndex(1)} aria-label="Partial" />
                        <button type="button" className="col-span-1" onClick={() => setIndex(2)} aria-label="Paid" />
                      </div>
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-sm transition-all duration-200 ease-out ${
                          paymentIndex === 2 ? "bg-emerald-400" : paymentIndex === 1 ? "bg-amber-400" : "bg-slate-300"
                        }`}
                        style={{ left: knobLeft }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {!formData.isMarkAsPaid && formData.enablePartialPayment && (
            <div className="space-y-2 mt-3">
              <Label htmlFor="partial-amount" className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
                Amount Received
              </Label>
              <Input
                id="partial-amount"
                type="number"
                max={grandTotal}
                placeholder="0"
                step="1"
                value={formData.partialPaymentAmount > 0 ? formData.partialPaymentAmount : ""}
                onChange={(e) => onInputChange("partialPaymentAmount", (e.target as HTMLInputElement).value)}
                style={glassInputStyle}
              />
              {Number(formData.partialPaymentAmount) > 0 && (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span style={{ color: "rgba(148,163,184,0.5)" }}>Paid:</span>
                    <span style={{ color: "rgba(52,211,153,0.7)" }}>
                      {currency}{paymentDetails.paidAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "rgba(148,163,184,0.5)" }}>Pending:</span>
                    <span style={{ color: "rgba(251,146,60,0.7)" }}>
                      {currency}{paymentDetails.balanceAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Discount */}
        <div className="space-y-2">
          <Label htmlFor="bill-discount" className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
            Discount
          </Label>
          <Input
            id="bill-discount"
            type="number"
            step="1"
            value={formData.discount > 0 ? formData.discount : ""}
            onChange={(e) => onInputChange("discount", (e.target as HTMLInputElement).value)}
            placeholder="0"
            style={glassInputStyle}
          />
        </div>

        {Number(formData.discount) > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: "rgba(148,163,184,0.6)" }}>Discount</span>
            <span style={{ color: "rgba(248,113,113,0.7)" }}>
              -{currency}{Number(formData.discount).toFixed(2)}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={onSaveDraft}
            disabled={savingDraft || isLoading || !formData.customerId}
            className="flex-1 gap-1.5"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {savingDraft ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving Draft...
              </div>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save as Draft
              </>
            )}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isLoading || !formData.customerId}
            className="flex-1 gap-1.5"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(139,92,246,0.15))",
              border: "1px solid rgba(56,189,248,0.25)",
            }}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Bill...
              </div>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {!online && installed && formData.offlineAutoUpload ? "Queue Bill" : "Create Bill"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

