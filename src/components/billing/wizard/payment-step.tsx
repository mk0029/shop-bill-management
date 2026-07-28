"use client";

import { useState, useMemo, useEffect } from "react";
import { fetchCustomerAdvanceBalance, calculateAdvanceOnBillCreation } from "@/lib/customer-advance";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { AppDateTimePicker } from "@/components/ui/app-date-time-picker";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  DollarSign,
  Wallet,
  BadgePercent,
  User,
  ShoppingCart,
  Wrench,
  Send,
  FileText,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { useOnline } from "@/hooks/use-online";
import { formatCurrency } from "@/lib/inventory-helpers";

interface PaymentStepProps {
  formData: any;
  selectedItems: any[];
  selectedCustomer: any;
  onInputChange: (field: string, value: any) => void;
  calculateTotal: () => number;
  calculateGrandTotal: () => number;
  getPaymentDetails: () => {
    paymentStatus: "pending" | "partial" | "paid";
    paidAmount: number;
    balanceAmount: number;
  };
  onEditStep: (step: number) => void;
}

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

const glassInner: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "14px",
};

const glassInput: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(16px)",
  borderRadius: "12px",
};

export function PaymentStep({
  formData,
  selectedItems,
  selectedCustomer,
  onInputChange,
  calculateTotal,
  calculateGrandTotal,
  getPaymentDetails,
  onEditStep,
}: PaymentStepProps) {
  const online = useOnline();
  const grandTotal = calculateGrandTotal();
  const total = calculateTotal();
  const paymentDetails = getPaymentDetails();
  const discount = Number(formData.discount || 0);
  const additionalCharges =
    Number(formData.repairFee || 0) + Number(formData.visitingCharges || 0);
  const amountReceived = Number(formData.amountReceived || 0);

  const [advanceBalance, setAdvanceBalance] = useState(0);
  useEffect(() => {
    if (selectedCustomer?._id) {
      fetchCustomerAdvanceBalance(selectedCustomer._id).then(setAdvanceBalance).catch(() => setAdvanceBalance(0));
    } else {
      setAdvanceBalance(0);
    }
  }, [selectedCustomer?._id]);

  const advanceCalc = useMemo(() => {
    if (advanceBalance > 0 && grandTotal > 0) {
      return calculateAdvanceOnBillCreation({ customerAdvanceBalance: advanceBalance, billTotal: grandTotal });
    }
    return { advanceApplied: 0, remainingBalance: grandTotal, isFullyCovered: false };
  }, [advanceBalance, grandTotal]);

  const effectivePayable = Math.max(0, grandTotal - advanceCalc.advanceApplied);
  const underPaid = amountReceived < effectivePayable ? effectivePayable - amountReceived : 0;
  const overPaid = amountReceived > grandTotal ? amountReceived - grandTotal : 0;
  const hasPayment = amountReceived > 0;

  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "card", label: "Card" },
    { value: "upi", label: "UPI" },
    { value: "bank_transfer", label: "Bank Transfer" },
  ];

  const paymentStatusLabel = paymentDetails.paymentStatus === "paid"
    ? overPaid > 0 ? "Paid (with Advance)" : "Paid"
    : paymentDetails.paymentStatus === "partial"
      ? "Partial"
      : "Pending";

  const paymentStatusColor = paymentDetails.paymentStatus === "paid"
    ? "rgba(52,211,153,0.8)"
    : paymentDetails.paymentStatus === "partial"
      ? "rgba(251,191,36,0.8)"
      : "rgba(148,163,184,0.5)";

  return (
    <div className="space-y-4">
      {/* Order Summary (compact review) */}
      <div style={glassCard} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white text-sm font-medium">Bill Summary</span>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="text-[10px] px-2 py-1 rounded-lg"
            style={{
              color: "rgba(56,189,248,0.6)",
              background: "rgba(56,189,248,0.06)",
              border: "1px solid rgba(56,189,248,0.1)",
            }}
          >
            Edit Items
          </button>
        </div>

        {/* Customer info line */}
        {selectedCustomer && (
          <div
            style={glassInner}
            className="p-2.5 mb-2 flex items-center gap-2"
          >
            <User
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: "rgba(148,163,184,0.4)" }}
            />
            <span className="text-xs text-white truncate">
              {selectedCustomer.name ||
                selectedCustomer.businessName ||
                "Customer"}
            </span>
            <span
              className="text-[10px] ml-auto shrink-0"
              style={{ color: "rgba(148,163,184,0.4)" }}
            >
              {formData.serviceType} | {formData.location}
            </span>
          </div>
        )}

        {/* Items compact list */}
        {selectedItems.length > 0 && (
          <div className="space-y-1 mb-3">
            {selectedItems.slice(0, 4).map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs"
              >
                <span
                  className="truncate max-w-[200px]"
                  style={{ color: "rgba(148,163,184,0.6)" }}
                >
                  {item.name} x{item.quantity}
                </span>
                <span style={{ color: "rgba(148,163,184,0.5)" }}>
                  {formatCurrency(item.total)}
                </span>
              </div>
            ))}
            {selectedItems.length > 4 && (
              <div
                className="text-[10px] text-center pt-0.5"
                style={{ color: "rgba(148,163,184,0.3)" }}
              >
                +{selectedItems.length - 4} more items
              </div>
            )}
          </div>
        )}

        {/* Totals */}
        <div
          className="space-y-1 pt-2 border-t"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="flex justify-between text-xs"
            style={{ color: "rgba(148,163,184,0.5)" }}
          >
            <span>Subtotal</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {additionalCharges > 0 && (
            <div
              className="flex justify-between text-xs"
              style={{ color: "rgba(148,163,184,0.5)" }}
            >
              <span>Service Fees</span>
              <span>{formatCurrency(additionalCharges)}</span>
            </div>
          )}
          {discount > 0 && (
            <div
              className="flex justify-between text-xs"
              style={{ color: "rgba(52,211,153,0.6)" }}
            >
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          {advanceCalc.advanceApplied > 0 && (
            <div
              className="flex justify-between text-xs"
              style={{ color: "rgba(52,211,153,0.8)" }}
            >
              <span>Advance Applied</span>
              <span>-{formatCurrency(advanceCalc.advanceApplied)}</span>
            </div>
          )}
          {amountReceived > 0 && (
            <div
              className="flex justify-between text-xs"
              style={{ color: "rgba(56,189,248,0.8)" }}
            >
              <span>Amount Received</span>
              <span>{formatCurrency(amountReceived)}</span>
            </div>
          )}
          {overPaid > 0 && (
            <div
              className="flex justify-between text-xs"
              style={{ color: "rgba(168,85,247,0.8)" }}
            >
              <span>Advance to Create</span>
              <span>+{formatCurrency(overPaid)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-semibold pt-1" style={{ color: paymentStatusColor }}>
            <span>{paymentStatusLabel}</span>
            <span>
              {underPaid > 0
                ? formatCurrency(underPaid) + " due"
                : paymentDetails.paymentStatus === "paid"
                  ? formatCurrency(0)
                  : formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        {/* Notes line */}
        {formData.notes && (
          <div
            className="flex items-center gap-1.5 mt-2 text-[10px]"
            style={{ color: "rgba(148,163,184,0.4)" }}
          >
            <FileText className="w-3 h-3" />
            <span className="truncate">{formData.notes}</span>
          </div>
        )}
      </div>

      {/* Discount */}
      <div style={glassCard} className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BadgePercent
            className="w-4 h-4"
            style={{ color: "rgba(52,211,153,0.6)" }}
          />
          <span className="text-white text-xs font-medium">Discount</span>
        </div>
        <Input
          type="number"
          min={0}
          step={1}
          value={formData.discount ?? ""}
          onChange={(e) => onInputChange("discount", e.target.value)}
          placeholder="0"
          style={glassInput}
          className="text-white text-xs"
        />
      </div>

      {/* Advance Balance */}
      {advanceBalance > 0 && (
        <div
          className="p-3 rounded-xl"
          style={{
            background: "linear-gradient(135deg,rgba(52,211,153,0.12),rgba(16,185,129,0.08))",
            border: "1px solid rgba(52,211,153,0.2)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(52,211,153,0.15)" }}
            >
              <span className="text-sm">💰</span>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-300">Advance Available</p>
              <p className="text-lg font-bold text-emerald-400">₹{advanceBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Amount Received */}
      <div style={glassCard} className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign
            className="w-4 h-4"
            style={{ color: "rgba(56,189,248,0.6)" }}
          />
          <span className="text-white text-xs font-medium">Amount Received</span>
        </div>
        <Input
          type="number"
          min={0}
          step={1}
          value={formData.amountReceived ?? ""}
          onChange={(e) => onInputChange("amountReceived", e.target.value)}
          placeholder="Enter amount received from customer"
          style={glassInput}
          className="text-white text-xs"
        />
        {amountReceived > 0 && (
          <div
            className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-lg"
            style={{
              background:
                paymentDetails.paymentStatus === "paid"
                  ? "rgba(52,211,153,0.08)"
                  : "rgba(251,191,36,0.08)",
              border: `1px solid ${
                paymentDetails.paymentStatus === "paid"
                  ? "rgba(52,211,153,0.2)"
                  : "rgba(251,191,36,0.2)"
              }`,
            }}
          >
            <span
              className="text-[11px] font-medium"
              style={{ color: paymentStatusColor }}
            >
              {paymentStatusLabel === "Paid (with Advance)"
                ? "Fully paid — excess will become advance"
                : paymentDetails.paymentStatus === "paid"
                  ? "Fully paid"
                  : `Partial — ${formatCurrency(underPaid)} remaining`}
            </span>
          </div>
        )}
      </div>

      {/* Payment Method + Date (shown when any amount received) */}
      <AnimatePresence>
        {hasPayment && (
          <motion.div
            key="payment-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div style={glassCard} className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard
                  className="w-4 h-4"
                  style={{ color: "rgba(56,189,248,0.6)" }}
                />
                <span className="text-white text-xs font-medium">
                  Payment Details
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-[10px] font-medium mb-1.5 block"
                    style={{ color: "rgba(148,163,184,0.6)" }}
                  >
                    Payment Method
                  </label>
                  <Dropdown
                    options={paymentMethods}
                    value={formData.paymentMethod || "cash"}
                    onValueChange={(value) =>
                      onInputChange("paymentMethod", value)
                    }
                    placeholder="Select payment method"
                  />
                </div>
                <div>
                  <label
                    className="text-[10px] font-medium mb-1.5 block"
                    style={{ color: "rgba(148,163,184,0.6)" }}
                  >
                    Payment Date
                  </label>
                  <AppDateTimePicker
                    mode="date"
                    value={formData.paymentDate || new Date().toISOString().split("T")[0]}
                    onChange={(v) => onInputChange("paymentDate", v)}
                    placeholder="Select payment date"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline auto-upload */}
      {!online && (
        <div style={glassInner} className="p-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.offlineAutoUpload ?? false}
              onChange={(e) =>
                onInputChange("offlineAutoUpload", e.target.checked)
              }
              className="rounded shrink-0"
              style={{ accentColor: "rgba(56,189,248,0.8)" }}
            />
            <div>
              <div
                className="text-xs font-medium"
                style={{ color: "rgba(148,163,184,0.7)" }}
              >
                Auto-upload when online
              </div>
              <div
                className="text-[10px]"
                style={{ color: "rgba(148,163,184,0.4)" }}
              >
                Queue this bill and submit when connection restores
              </div>
            </div>
          </label>
        </div>
      )}

      {/* WhatsApp hint */}
      {selectedCustomer?.phone && (
        <div style={glassInner} className="p-2.5 flex items-center gap-2">
          <Send
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: "rgba(52,211,153,0.4)" }}
          />
          <span
            className="text-[10px]"
            style={{ color: "rgba(148,163,184,0.4)" }}
          >
            Bill summary will be sent via WhatsApp to {selectedCustomer.phone}
          </span>
        </div>
      )}
    </div>
  );
}