"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  X,
  Smartphone,
  MessageSquare,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateBillReference,
  safeParseAmount,
  formatIndianRupee,
  getUpiApps,
  launchUpiApp,
  generateUpiUri,
} from "@/lib/upi-utils";
import { checkPaymentsDisabled } from "@/lib/payments-config";
import type { BillData } from "./types";

const DEFAULT_MERCHANT_UPI_ID = "7015493276@axl";
const DEFAULT_MERCHANT_NAME = "Jambh Electricals";
const DEFAULT_SUPPORT_WHATSAPP = "918607871431";

const GLASS =
  "bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-800/95 backdrop-blur-2xl border border-white/10";

export interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: BillData;
  merchantUpiId?: string;
  merchantName?: string;
  supportWhatsApp?: string;
}

export function UpiPaymentModal({
  isOpen,
  onClose,
  bill,
  merchantUpiId =
    process.env.NEXT_PUBLIC_MERCHANT_UPI_ID || DEFAULT_MERCHANT_UPI_ID,
  merchantName =
    process.env.NEXT_PUBLIC_SHOP_NAME || DEFAULT_MERCHANT_NAME,
  supportWhatsApp =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || DEFAULT_SUPPORT_WHATSAPP,
}: UpiPaymentModalProps) {
  const amount = useMemo(() => safeParseAmount(bill.totalAmount), [bill.totalAmount]);
  const billReference = useMemo(
    () => generateBillReference(bill.billNumber, bill._id),
    [bill.billNumber, bill._id]
  );
  const apps = useMemo(() => getUpiApps(), []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleAppClick = useCallback((appId: string) => {
    const app = apps.find((a) => a.id === appId);
    if (!app) return;
    launchUpiApp(app, {
      pa: merchantUpiId,
      pn: merchantName,
      am: amount,
      tn: billReference,
      cu: "INR",
      mode: "04",
    });
  }, [apps, merchantUpiId, merchantName, amount, billReference]);

  const [copyFallback, setCopyFallback] = useState(false);

  const handleOtherUpi = useCallback(() => {
    const uri = generateUpiUri({
      pa: merchantUpiId,
      pn: merchantName,
      am: amount,
      tn: billReference,
      cu: "INR",
      mode: "04",
    });
    window.location.href = uri;
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText(merchantUpiId);
        setCopyFallback(true);
        setTimeout(() => setCopyFallback(false), 3000);
      } catch {}
    }, 500);
  }, [merchantUpiId, merchantName, amount, billReference]);

  const whatsappMessage = useMemo(() => {
    const msg = [
      `Hello, I have completed the payment for Bill ${bill.billNumber}.`,
      `Kindly verify my payment and update the bill status.`,
      `Reference: ${billReference}`,
      `Amount: ${formatIndianRupee(amount)}`,
      `Thank you.`,
    ].join("%0A");
    return `https://wa.me/${supportWhatsApp}?text=${msg}`;
  }, [bill.billNumber, billReference, amount, supportWhatsApp]);

  const content = (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center p-4",
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      )}
      style={{ visibility: isOpen ? "visible" : "hidden" }}
    >
      <motion.div
        initial={false}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        initial={false}
        animate={{
          opacity: isOpen ? 1 : 0,
          scale: isOpen ? 1 : 0.96,
          y: isOpen ? 0 : 20,
        }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className={cn(
          "relative w-full max-w-sm rounded-[22px] shadow-2xl shadow-black/40",
          GLASS
        )}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-purple-400" />
            Pay via UPI
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] transition-all text-white/40 hover:text-white/80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {checkPaymentsDisabled() ? (
          <div className="p-10 text-center space-y-4">
            <Ban className="w-12 h-12 text-red-400 mx-auto" />
            <p className="text-lg font-bold text-white">Payments Temporarily Unavailable</p>
            <p className="text-sm text-gray-400">Online payments are currently disabled. Please contact the shop directly for payment.</p>
          </div>
        ) : (
        <div className="p-5 space-y-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{formatIndianRupee(amount)}</p>
            <p className="text-xs text-gray-400 mt-1">Bill #{bill.billNumber}</p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {apps.map((app) => (
              <button
                key={app.id}
                onClick={() => handleAppClick(app.id)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] active:scale-95 transition-all"
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: app.color }}
                  dangerouslySetInnerHTML={{ __html: app.icon }}
                />
                <span className="text-[11px] text-gray-300 font-medium leading-tight">{app.name}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleOtherUpi}
            className="w-full py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm text-gray-300 hover:bg-white/[0.1] transition-all active:scale-[0.98]"
          >
            Other UPI App
          </button>
          {copyFallback && (
            <p className="text-[10px] text-gray-500 text-center">UPI ID copied to clipboard — open your UPI app and paste to pay</p>
          )}

          <div className="pt-2 border-t border-white/[0.06]">
            <p className="text-sm font-bold text-amber-400 text-center mb-3 bg-amber-500/10 py-2 px-3 rounded-lg border border-amber-500/20">
              After payment, contact the admin for verification
            </p>
            <a
              href={whatsappMessage}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all active:scale-[0.98]"
            >
              <MessageSquare className="w-4 h-4" />
              Contact Admin
            </a>
          </div>
        </div>
        )}
      </motion.div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(content, document.body);
}
