/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, MessageSquare, Copy, Phone, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { PremiumBillHeader } from "./bill-detail-modal/PremiumBillHeader";
import { TechnicianCard } from "./bill-detail-modal/TechnicianCard";
import { BillSummary } from "./bill-detail-modal/BillSummary";
import { ItemsCard } from "./bill-detail-modal/ItemsCard";
import { ChargesCard } from "./bill-detail-modal/ChargesCard";
import { PaymentCard } from "./bill-detail-modal/PaymentCard";
import { NotesCard } from "./bill-detail-modal/NotesCard";
import { ActivityTimeline } from "./bill-detail-modal/ActivityTimeline";
import { BottomActionBar } from "./bill-detail-modal/BottomActionBar";
import { EditBillSheet } from "./bill-detail-modal/EditBillSheet";
import { BillSkeleton } from "./bill-detail-modal/SkeletonLoader";
import { ShareModal } from "./bill-detail-modal/ShareModal";
import { PaymentUpdateModal } from "@/components/ui/payment-update-modal";

import { useLocaleStore } from "@/store/locale-store";
import { BillDetails, generateWhatsAppMessage } from "@/lib/whatsapp-share";
import { sendManualReminder } from "@/lib/manual-reminder";
import { sendManualWhatsApp } from "@/lib/manual-whatsapp";

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
    },
  ) => Promise<void>;
  onEditBill?: (bill: any) => void;
  onDeleteBill?: (billId: string) => void;
  onDuplicateBill?: (bill: any) => void;
  onRemindCustomer?: (bill: any) => void;
  onWhatsAppCustomer?: (bill: any) => void;
  onPrintBill?: (bill: any) => void;
  onUPIPayment?: (bill: any) => void;
  showShareButton?: boolean;
  showPaymentControls?: boolean;
  role?: "admin" | "customer";
}

export const BillDetailModal = ({
  isOpen,
  onClose,
  bill,
  onDownloadPDF,
  onPayOnline,
  onUpdatePayment,
  onEditBill,
  onDeleteBill,
  onDuplicateBill,
  onRemindCustomer,
  onWhatsAppCustomer: onWhatsAppCustomerProp,
  onPrintBill,
  onUPIPayment,
  showShareButton = true,
  showPaymentControls = true,
  role = "admin",
}: BillDetailModalProps) => {
  const { currency } = useLocaleStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && bill) {
      setLoading(true);
      const t = setTimeout(() => setLoading(false), 400);
      return () => clearTimeout(t);
    }
  }, [isOpen, bill?._id]);

  const handleClose = useCallback(() => {
    setShowShareModal(false);
    setShowEditSheet(false);
    setShowPaymentModal(false);
    onClose();
  }, [onClose]);

  const buildBillDetails = useCallback(
    (b: any): BillDetails => ({
      ...b,
      repairFee: b?.repairFee ?? b?.repairCharges ?? 0,
      grandTotal: b?.totalAmount ?? 0,
      technician: b?.technician,
      customerAuth: { secretKey: b?.customer?.secretKey || undefined },
    }),
    [],
  );

  const handleShareOnWhatsApp = useCallback(async () => {
    if (!bill) return;
    if (role !== "admin") {
      toast.error("Only Admin and Super Admin can send WhatsApp messages");
      return;
    }

    const customerId =
      bill.customer?._id ||
      bill.customer?._ref ||
      bill.customerId ||
      bill.userId;
    if (!customerId) {
      toast.error("Customer ID is required");
      return;
    }

    try {
      setIsSendingWhatsApp(true);
      const result = await sendManualWhatsApp({
        shareType: "bill",
        customerId: String(customerId),
        billId: String(bill._id || bill.id || bill.billId || ""),
      });

      if (result.rateLimited) {
        toast.error(
          result.error ||
            "One manual WhatsApp message per customer/bill is allowed every 5 minutes",
        );
        return;
      }

      if (!result.success) {
        throw new Error(result.error || "Unable to send WhatsApp message");
      }

      toast.success("WhatsApp message sent successfully");
      setShowShareModal(false);
    } catch (e: any) {
      const msg = e?.message || "Unable to send WhatsApp message";
      toast.error(msg);
    } finally {
      setIsSendingWhatsApp(false);
    }
  }, [bill, role]);
  const handleNativeShare = useCallback(() => {
    if (!bill) return;
    const details = buildBillDetails(bill);
    const message = generateWhatsAppMessage(details, currency);
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        (navigator as any).share({ text: message }).catch(() => {});
        setShowShareModal(false);
      }
    } catch {
      toast.info(
        "Use 'Send Reminder' to manually send a WhatsApp reminder for this bill.",
      );
    }
  }, [bill, currency, buildBillDetails]);

  const handleCopyToClipboard = useCallback(() => {
    if (!bill) return;
    const details = buildBillDetails(bill);
    const message = generateWhatsAppMessage(details, currency);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(
          message.replace(
            `https://jambh-ell.vercel.app/login?phone=${encodeURIComponent(bill.customer?.phone || "")}&passKey=${encodeURIComponent(bill.customer?.secretKey || "")}`,
            "https://jambh-ell.vercel.app/#request",
          ),
        )
        .then(() => {
          toast.success("Bill details copied to clipboard!");
          setShowShareModal(false);
        })
        .catch(() => toast.error("Failed to copy to clipboard"));
    }
  }, [bill, currency, buildBillDetails]);

  const handleShare = useCallback(() => {
    setShowShareModal(true);
  }, []);

  const handleEditBill = useCallback(() => {
    if (role === "admin") setShowEditSheet(true);
  }, [role]);

  const handleOpenPayment = useCallback(() => {
    setShowPaymentModal(true);
  }, []);

  const handleSendWhatsAppReminder = useCallback(async () => {
    if (!bill) return;
    try {
      setIsSendingReminder(true);
      const result = await sendManualReminder({
        billId: bill._id || bill.id || bill.billId,
        customerId: bill.customer?._id || bill.customerId,
      });

      if (result.rateLimited) {
        toast.info(
          "Reminder was already sent recently. Please wait a few minutes before trying again.",
        );
        return;
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to send reminder");
      }

      toast.success("WhatsApp reminder sent successfully!");
    } catch (e: any) {
      toast.error(
        e?.message || "Unable to send WhatsApp reminder. Please try again.",
      );
    } finally {
      setIsSendingReminder(false);
    }
  }, [bill]);

  const handlePaymentUpdateWrapper = useCallback(
    async (billId: string, paymentData: any) => {
      if (onUpdatePayment) {
        await onUpdatePayment(billId, paymentData);
      }
      setShowPaymentModal(false);
    },
    [onUpdatePayment],
  );

  const modalContent = useMemo(() => {
    if (!bill) return null;

    return (
      <div className="relative">
        <div className="space-y-5 sm:space-y-6">
          <PremiumBillHeader bill={bill} role={role} currency={currency} />

          <TechnicianCard bill={bill} />

          <ItemsCard bill={bill} currency={currency} />

          <ChargesCard bill={bill} currency={currency} />

          <BillSummary bill={bill} currency={currency} />

          <PaymentCard
            bill={bill}
            currency={currency}
            role={role}
            onOpenPaymentModal={
              role === "admin" && showPaymentControls
                ? handleOpenPayment
                : undefined
            }
            onPayOnline={undefined}
            onUPIPayment={role === "customer" ? onUPIPayment : undefined}
          />

          <NotesCard bill={bill} />

          <ActivityTimeline bill={bill} />

          {role === "admin" && (
            <BottomActionBar
              role={role}
              bill={bill}
              onEditBill={handleEditBill}
              onUpdatePayment={handleOpenPayment}
              onShare={showShareButton ? handleShare : undefined}
              onWhatsAppCustomer={handleShareOnWhatsApp}
              onRemindCustomer={() => onRemindCustomer?.(bill)}
              onDeleteBill={(id) => onDeleteBill?.(id)}
              onDuplicateBill={() => onDuplicateBill?.(bill)}
              onPayOnline={undefined}
              onPrintBill={onPrintBill}
              onSendWhatsAppReminder={
                bill.paymentStatus !== "paid"
                  ? handleSendWhatsAppReminder
                  : undefined
              }
              isSendingReminder={isSendingReminder}
              isSendingWhatsApp={isSendingWhatsApp}
            />
          )}

          {role === "customer" && (
            <div className="sticky -bottom-4 sm:bottom-0 z-30  mt-6">
              <div className=" px-4 py-3 max-sm:mx-4 sm:px-5 flex-1 bg-slate-950/90 rounded-lg md:rounded-2xl">
                <div className="flex items-center justify-evenly gap-2.5 overflow-x-visible no-scrollbar">
                  {showShareButton && (
                    <button
                      onClick={handleShare}
                      className="flex flex-col items-center gap-1 min-w-[72px] sm:min-w-[80px] px-2 sm:px-3 py-2 sm:py-2.5 rounded-2xl text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 glass-dock-btn text-white/70"
                    >
                      <Share2 className="w-5 h-5 sm:w-5 sm:h-5" />
                      <span className="leading-tight">Share</span>
                    </button>
                  )}
                  <button
                    onClick={handleShareOnWhatsApp}
                    className="flex flex-col items-center gap-1 min-w-[72px] sm:min-w-[80px] px-2 sm:px-3 py-2 sm:py-2.5 rounded-2xl text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 glass-dock-btn text-white/70"
                  >
                    <MessageSquare className="w-5 h-5 sm:w-5 sm:h-5" />
                    <span className="leading-tight">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => {
                      const id = bill.billNumber || bill._id || bill.billId;
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(String(id));
                        toast.success("Bill ID copied");
                      }
                    }}
                    className="flex flex-col items-center gap-1 min-w-[72px] sm:min-w-[80px] px-2 sm:px-3 py-2 sm:py-2.5 rounded-2xl text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 glass-dock-btn text-white/70"
                  >
                    <Copy className="w-5 h-5 sm:w-5 sm:h-5" />
                    <span className="leading-tight">Copy ID</span>
                  </button>
                  {bill.customer?.phone && (
                    <a
                      href={`tel:${bill.customer.phone}`}
                      className="flex flex-col items-center gap-1 min-w-[72px] sm:min-w-[80px] px-2 sm:px-3 py-2 sm:py-2.5 rounded-2xl text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 glass-dock-btn text-white/70"
                    >
                      <Phone className="w-5 h-5 sm:w-5 sm:h-5" />
                      <span className="leading-tight">Call Shop</span>
                    </a>
                  )}
                  {onUPIPayment && (bill.paymentStatus === "pending" || bill.paymentStatus === "partial" || bill.paymentStatus === "overdue") && (
                    <button
                      onClick={() => onUPIPayment(bill)}
                      className="flex flex-col items-center gap-1 min-w-[72px] sm:min-w-[80px] px-2 sm:px-3 py-2 sm:py-2.5 rounded-2xl text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 glass-dock-btn text-purple-300 hover:text-purple-200"
                    >
                      <Smartphone className="w-5 h-5 sm:w-5 sm:h-5" />
                      <span className="leading-tight">Pay via UPI</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <ShareModal
          showShareModal={showShareModal}
          setShowShareModal={setShowShareModal}
          onShareOnWhatsApp={handleShareOnWhatsApp}
          onNativeShare={handleNativeShare}
          onCopyToClipboard={handleCopyToClipboard}
          isSending={isSendingWhatsApp}
        />
      </div>
    );
  }, [
    bill,
    role,
    currency,
    showPaymentControls,
    showShareModal,
    isSendingWhatsApp,
    onUpdatePayment,
    onPayOnline,
    onDownloadPDF,
    onDeleteBill,
    onDuplicateBill,
    onRemindCustomer,
    onPrintBill,
    handleEditBill,
    handleOpenPayment,
    handleShare,
    handleShareOnWhatsApp,
    handleNativeShare,
    handleCopyToClipboard,
  ]);

  if (!mounted) return null;

  return (
    <>
      <BaseGlassModal
        isOpen={isOpen}
        onClose={handleClose}
        size="lg"
        mobileType="modal"
        zIndex={220}
        forceFullSize
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <BillSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {modalContent}
            </motion.div>
          )}
        </AnimatePresence>
      </BaseGlassModal>

      {role === "admin" && (
        <>
          <EditBillSheet
            isOpen={showEditSheet}
            onClose={() => setShowEditSheet(false)}
            bill={bill}
            onSave={async (updatedBill) => {
              if (onEditBill) {
                onEditBill(updatedBill);
              }
              setShowEditSheet(false);
              toast.success("Bill updated successfully");
            }}
          />

          <PaymentUpdateModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            bill={bill}
            currency={currency}
            onUpdatePayment={handlePaymentUpdateWrapper}
          />
        </>
      )}
    </>
  );
};
