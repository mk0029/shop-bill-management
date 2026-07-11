"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getUpiApps,
  launchUpiApp,
  launchUpiWithChooser,
  validateUpiId,
  validateAmount,
  generateUpiUri,
} from "@/lib/upi-utils";
import { safeParseAmount } from "@/lib/upi-utils";
import type { BillData } from "./types";

const APP_SUBTITLES: Record<string, string> = {
  "google-pay": "Quick Pay",
  phonepe: "Pay Instantly",
  paytm: "Open App",
  bhim: "Government UPI",
  "amazon-pay": "UPI Payment",
};

interface Props {
  bill: BillData;
  merchantUpiId: string;
  merchantName: string;
  billReference: string;
  onLaunched: () => void;
}

export function UpiButtons({ bill, merchantUpiId, merchantName, billReference, onLaunched }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const apps = useMemo(() => getUpiApps(), []);

  const amount = safeParseAmount(bill.totalAmount);

  const validateDeepLink = useCallback(() => {
    if (!validateUpiId(merchantUpiId)) return "Invalid Merchant UPI ID";
    if (!validateAmount(amount)) return "Invalid bill amount";
    if (!billReference?.trim()) return "Missing bill reference";
    return null;
  }, [merchantUpiId, amount, billReference]);

  const handleAppClick = useCallback(
    (appId: string) => {
      setError(null);
      const validationError = validateDeepLink();
      if (validationError) {
        setError(validationError);
        return;
      }

      setLaunchingId(appId);

      const app = apps.find((a) => a.id === appId);
      if (!app) return;

      setTimeout(() => {
        try {
          launchUpiApp(app, {
            pa: merchantUpiId,
            pn: merchantName,
            am: amount,
            tn: billReference,
            cu: "INR",
          });
          onLaunched();
        } catch {
          setError(`Failed to open ${app.name}. Please scan the QR code instead.`);
        }
        setLaunchingId(null);
      }, 150);
    },
    [apps, merchantUpiId, merchantName, amount, billReference, onLaunched, validateDeepLink]
  );

  const handleOtherUpi = useCallback(() => {
    setError(null);
    const validationError = validateDeepLink();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const uri = generateUpiUri({
        pa: merchantUpiId,
        pn: merchantName,
        am: amount,
        tn: billReference,
        cu: "INR",
      });
      window.location.href = uri;
      onLaunched();
    } catch {
      setError("Failed to launch UPI app. Please scan the QR code.");
    }
  }, [merchantUpiId, merchantName, amount, billReference, onLaunched, validateDeepLink]);

  return (
    <div>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3">
        {apps.map((app) => (
          <button
            key={app.id}
            onClick={() => handleAppClick(app.id)}
            disabled={launchingId !== null}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 p-3 rounded-xl",
              "border border-white/[0.08] bg-white/[0.03]",
              "hover:bg-white/[0.08] hover:border-white/[0.15]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50",
              "transition-all duration-150",
              "active:scale-[0.97]",
              launchingId === app.id && "pointer-events-none opacity-70"
            )}
            aria-label={`Pay with ${app.name}`}
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105"
              style={{ backgroundColor: app.color }}
              dangerouslySetInnerHTML={{ __html: app.icon }}
            />
            <span className="text-[11px] text-gray-300 font-medium leading-tight">
              {app.name}
            </span>
            <span className="text-[9px] text-gray-500 leading-tight -mt-0.5">
              {APP_SUBTITLES[app.id] ?? "Pay"}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={handleOtherUpi}
        disabled={launchingId !== null}
        className="w-full py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm text-gray-300 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 transition-all active:scale-[0.98]"
      >
        Other UPI App
      </button>
    </div>
  );
}
