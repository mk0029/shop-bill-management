/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Modal } from "@/components/ui/modal";
import {
  BillHeader,
  BillItems,
  BillCharges,
  BillTotals,
  PaymentControls,
  BillActions,
  ShareModal,
} from "./bill-detail-modal/index";

import { useState } from "react";

import { useRouter } from "next/navigation";

// Switch not needed after redesign of payment UI
import {
  BillDetails,
  shareBillOnWhatsApp,
  generateWhatsAppMessage,
} from "@/lib/whatsapp-share";

import { useLocaleStore } from "@/store/locale-store";

import { AnimatePresence, motion } from "framer-motion";

import {
  Calendar,
  CreditCard,
  Download,
  Edit3,
  FileText,
  MapPin,
  Save,
  Share2,
  MessageSquare,
  CheckCircle2,
  Copy,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface BillDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  onDownloadPDF?: (bill: any) => void;
  onPayOnline?: (bill: any) => void;
  onUpdatePayment?: (
    billId: string,
    paymentData: {
      paymentStatus: "pending" | "partial" | "paid";
      paidAmount: number;
      balanceAmount: number;
      discount?: number;
    }
  ) => Promise<void>;
  showShareButton?: boolean;
  showPaymentControls?: boolean;
}

export const BillDetailModal = ({
  isOpen,
  onClose,
  bill,
  onPayOnline,
  onDownloadPDF,
  onUpdatePayment,
  showShareButton = true,
  showPaymentControls = true,
}: BillDetailModalProps) => {
  const router = useRouter();
  const { currency } = useLocaleStore();

  // Payment state management (redesigned)
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"paid" | "partial">("partial");
  const [partialAmount, setPartialAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  if (!bill) return null;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-green-900 text-green-300 border-green-700";
      case "partial":
        return "bg-orange-900 text-orange-300 border-orange-700";
      case "pending":
        return "bg-yellow-900 text-yellow-300 border-yellow-700";
      case "overdue":
        return "bg-red-900 text-red-300 border-red-700";
      default:
        return "bg-gray-900 text-gray-300 border-gray-700";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const itemsTotal =
    bill.items?.reduce(
      (total: number, item: any) => total + (item.totalPrice || 0),
      0
    ) || 0;

  // Helper to coerce possibly string numeric fields to number
  const toNum = (v: any): number => {
    if (typeof v === "number" && isFinite(v)) return v;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Normalize charge fields to numbers and coalesce keys
  const transportationFee = toNum(bill.transportationFee);
  const homeVisitFee = toNum(bill.homeVisitFee);
  const laborCharges = toNum(bill.laborCharges);
  const repairChargeValue = toNum(
    bill.repairCharges ?? bill.repairFee ?? (bill as any).repairCharge ?? 0
  );

  const additionalCharges =
    homeVisitFee + transportationFee + repairChargeValue + laborCharges;

  // Show Additional Charges section if any charge field is present on the bill
  const hasAnyCharge =
    bill.homeVisitFee !== undefined ||
    bill.transportationFee !== undefined ||
    bill.repairCharges !== undefined ||
    (bill as any).repairCharge !== undefined ||
    bill.repairFee !== undefined ||
    bill.laborCharges !== undefined;

  // Prefer explicit totals from bill to match list cards
  const explicitTotal = toNum((bill as any).totalAmount ?? (bill as any).total);
  const grandTotal =
    explicitTotal > 0 ? explicitTotal : itemsTotal + additionalCharges;
  const existingDiscountTotal = toNum(
    (bill as any)?.discount ??
      (bill as any)?.discountAmount ??
      (bill as any)?.customerDiscount ??
      (bill as any)?.appliedDiscount ??
      0
  );
  const getEffectiveGrandTotal = () => {
    const addDiscount = Math.max(Number(discountAmount || 0), 0);
    return Math.max(0, grandTotal - (existingDiscountTotal + addDiscount));
  };
  // Payment calculation logic
  const calculatePaymentDetails = () => {
    const alreadyPaid = toNum(bill.paidAmount || 0);
    if (paymentMode === "paid") {
      return {
        paymentStatus: "paid" as const,
        paidAmount: getEffectiveGrandTotal(),
        balanceAmount: 0,
      };
    }
    if (paymentMode === "partial") {
      const add = Math.max(Number(partialAmount || 0), 0);
      const effectiveGrand = getEffectiveGrandTotal();
      const newPaid = Math.min(alreadyPaid + add, effectiveGrand);
      const balanceAmount = Math.max(0, effectiveGrand - newPaid);
      return {
        paymentStatus:
          balanceAmount > 0 ? ("partial" as const) : ("paid" as const),
        paidAmount: newPaid,
        balanceAmount,
      };
    }
    return null;
  };

  // Handle payment update
  const handlePaymentUpdate = async () => {
    if (!onUpdatePayment) return;
    const paymentDetails = calculatePaymentDetails();
    if (!paymentDetails) return;
    setIsUpdatingPayment(true);
    try {
      const id =
        (bill as any)?._id ??
        (bill as any)?.id ??
        (bill as any)?.billId ??
        (bill as any)?._ref;
      if (!id) throw new Error("Missing bill id");
      await onUpdatePayment(String(id), {
        ...paymentDetails,
        // Send discount only if provided and > 0
        ...(discountAmount !== "" && Number(discountAmount) > 0
          ? { discount: Number(discountAmount) }
          : {}),
      });
      // Removed forced global refetch; rely on optimistic update + realtime
      if (bill) {
        bill.paymentStatus = paymentDetails.paymentStatus;
        bill.paidAmount = paymentDetails.paidAmount;
        bill.balanceAmount = paymentDetails.balanceAmount;
        // Optimistically update discount to cumulative value (only 'discount' key)
        const add = Math.max(Number(discountAmount || 0), 0);
        if (add > 0) {
          const prevDiscount =
            Number(
              (bill as any)?.discount ?? (bill as any)?.discountAmount ?? 0
            ) || 0;
          const totalDiscount = prevDiscount + add;
          (bill as any).discount = totalDiscount;
        }
      }
      setIsEditingPayment(false);
      setPaymentMode("partial");
      setPartialAmount("");
      setDiscountAmount("");
      const isFull = paymentDetails.paymentStatus === "paid";
      const added = Math.max(Number(partialAmount || 0), 0);
      toast.success(
        isFull
          ? "✅ Bill marked as fully paid!"
          : `✅ Payment of ₹${added.toFixed(2)} recorded successfully!`
      );
      onClose();
    } catch (error) {
      console.error("Failed to update payment:", error);
      toast.error("❌ Failed to update payment. Please try again.");
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  // Quick amount helpers removed per UX request

  // Reset payment state when modal closes
  const handleClose = () => {
    setIsEditingPayment(false);
    setPaymentMode("partial");
    setPartialAmount("");
    setDiscountAmount("");
    setShowShareModal(false);
    onClose();
  };

  const getCustomerId = (c: any) =>
    typeof c === "string" ? c : c?._id || c?._ref;
  const resolveCustomerIdFromBill = (b: any) => {
    const c = b?.customer;
    if (typeof c === "string" && c) return c;
    const direct = c?._id || c?.id || c?._ref;
    if (direct) return direct;
    const viaField =
      b?.customerId || b?.customer_id || b?.customerRef || b?.customer_ref;
    return viaField || null;
  };

  const additionalChargesF = [
    {
      label: "Transportation Fee",
      value: transportationFee,
    },
    {
      label: "Home Visit Fee",
      value: homeVisitFee,
    },
    {
      label: "Repair Charges",
      value: repairChargeValue,
    },
    {
      label: "Labor Charges",
      value: laborCharges,
    },
  ];

  // Handle share functionality
  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleShareOnWhatsApp = () => {
    const billDetails: BillDetails = {
      ...bill,
      repairFee: (bill as any).repairFee ?? (bill as any).repairCharges ?? 0,
      grandTotal: grandTotal,
      technician: bill.technician,
      customerAuth: {
        secretKey: bill.customer?.secretKey || undefined,
      },
    };
    shareBillOnWhatsApp(billDetails);
    setShowShareModal(false);
  };

  const handleNativeShare = () => {
    const billDetails: BillDetails = {
      ...bill,
      repairFee: (bill as any).repairFee ?? (bill as any).repairCharges ?? 0,
      grandTotal: grandTotal,
      technician: bill.technician,
      customerAuth: {
        secretKey: bill.customer?.secretKey || undefined,
      },
    };
    const message = generateWhatsAppMessage(billDetails, currency);

    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        (navigator as any).share({ text: message }).catch(() => {});
        setShowShareModal(false);
      }
    } catch {
      // Fallback to WhatsApp if native share fails
      handleShareOnWhatsApp();
    }
  };

  const handleCopyToClipboard = () => {
    const billDetails: BillDetails = {
      ...bill,
      repairFee: (bill as any).repairFee ?? (bill as any).repairCharges ?? 0,
      grandTotal: grandTotal,
      technician: bill.technician,
      customerAuth: {
        secretKey: bill.customer?.secretKey || undefined,
      },
    };
    const message = generateWhatsAppMessage(billDetails, currency);

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(message)
        .then(() => {
          toast.success("Bill details copied to clipboard!");
          setShowShareModal(false);
        })
        .catch(() => {
          toast.error("Failed to copy to clipboard");
        });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="relative">
        <div className="space-y-6 max-md:space-y-3 md:p-6">
          {/* Header */}
          <BillHeader
            bill={bill}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
          />

          {/* Customer Info */}
          {bill.customer && (
            <div className="bg-gray-800/50 rounded-lg p-2 sm:p-4 border border-gray-700">
              <div className="text-sm text-gray-300 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{bill.customer.name}</p>
                  {bill.customer.phone && (
                    <p className="text-gray-400">{bill.customer.phone}</p>
                  )}
                  {bill.customer.phone && (
                    <>
                      &nbsp; | &nbsp;
                      <Link
                        href={`tel:${bill.customer.phone}`}
                        className="text-blue-400 hover:underline text-base"
                      >
                        Call
                      </Link>
                    </>
                  )}
                </div>
                {bill.customer.email && (
                  <p className="text-gray-400">{bill.customer.email}</p>
                )}
                {(bill.customerAddress || bill.customer.location) && (
                  <p className="text-gray-400">
                    {bill.customerAddress?.addressLine1 ||
                      bill.customer.location}
                    {bill.customerAddress?.city &&
                      `, ${bill.customerAddress.city}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Items */}
          <BillItems bill={bill} currency={currency} />

          {/* Additional Charges */}
          <BillCharges
            bill={bill}
            currency={currency}
            transportationFee={transportationFee}
            homeVisitFee={homeVisitFee}
            repairChargeValue={repairChargeValue}
            laborCharges={laborCharges}
          />

          {/* Total Section */}
          <BillTotals
            bill={bill}
            currency={currency}
            grandTotal={grandTotal}
            existingDiscountTotal={existingDiscountTotal}
            discountAmount={discountAmount}
            toNum={toNum}
          />

          {/* Notes */}
          {bill.notes && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="font-medium text-white mb-2">Notes</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {bill.notes}
              </p>
            </div>
          )}

          {/* Payment Controls */}
          {showPaymentControls &&
            onUpdatePayment &&
            bill.paymentStatus !== "paid" && (
              <PaymentControls
                isEditingPayment={isEditingPayment}
                setIsEditingPayment={setIsEditingPayment}
                paymentMode={paymentMode}
                setPaymentMode={setPaymentMode}
                partialAmount={partialAmount}
                setPartialAmount={setPartialAmount}
                discountAmount={discountAmount}
                setDiscountAmount={setDiscountAmount}
                isUpdatingPayment={isUpdatingPayment}
                grandTotal={grandTotal}
                getEffectiveGrandTotal={getEffectiveGrandTotal}
                toNum={toNum}
                bill={bill}
                handlePaymentUpdate={handlePaymentUpdate}
                currency={currency}
              />
            )}

          {/* Action Buttons */}
          <BillActions
            showShareButton={showShareButton}
            onShare={handleShare}
            onCheckAllBills={() => {
              const id = resolveCustomerIdFromBill(bill);
              if (!id) {
                toast.error("Customer ID not available for this bill.");
                return;
              }
              router.push(`/admin/customers/${id}/bills`);
            }}
          />

          {/* Share Modal */}
          <ShareModal
            showShareModal={showShareModal}
            setShowShareModal={setShowShareModal}
            onShareOnWhatsApp={handleShareOnWhatsApp}
            onNativeShare={handleNativeShare}
            onCopyToClipboard={handleCopyToClipboard}
          />
        </div>
      </div>
    </Modal>
  );
};
