"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Smartphone, AlertCircle, Loader2 } from "lucide-react";
import { generateQrDataUrl, validateUpiId, validateAmount, generateUpiUri } from "@/lib/upi-utils";
import { safeParseAmount } from "@/lib/upi-utils";
import type { BillData } from "./types";

interface Props {
  bill: BillData;
  merchantUpiId: string;
  merchantName: string;
  billReference: string;
}

export function QrSection({ bill, merchantUpiId, merchantName, billReference }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const amount = safeParseAmount(bill.totalAmount);

  const validate = useCallback(() => {
    const issues: string[] = [];
    if (!validateUpiId(merchantUpiId))
      issues.push("Invalid or missing Merchant UPI ID");
    if (!merchantName?.trim())
      issues.push("Merchant name is required");
    if (!validateAmount(amount))
      issues.push("Invalid or missing bill amount");
    if (!billReference?.trim())
      issues.push("Bill reference is required");
    return issues;
  }, [merchantUpiId, merchantName, amount, billReference]);

  useEffect(() => {
    let cancelled = false;
    setGenerating(true);
    setError(null);

    const issues = validate();
    if (issues.length > 0) {
      setError(issues.join(". "));
      setGenerating(false);
      return;
    }

    const uri = generateUpiUri({
      pa: merchantUpiId,
      pn: merchantName,
      am: amount,
      tn: billReference,
      cu: "INR",
    });

    generateQrDataUrl(uri, { width: 320, margin: 2 })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setGenerating(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to generate QR code. Please try again.");
          setGenerating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [merchantUpiId, merchantName, amount, billReference, validate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-red-400 text-sm text-center max-w-xs">{error}</p>
        <p className="text-gray-500 text-xs text-center">
          Unable to generate payment QR. Required payment information is missing.
        </p>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-purple-400" />
        </motion.div>
        <p className="text-gray-400 text-sm">Generating QR code...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative bg-white p-3 rounded-2xl shadow-lg shadow-black/20 mb-2">
        <img
          src={qrDataUrl!}
          alt={`UPI QR for ${billReference}`}
          className="w-56 h-56 sm:w-60 sm:h-60"
        />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-black/5 pointer-events-none" />
      </div>
      <p className="text-xs text-gray-500 flex items-center gap-1.5">
        <Smartphone className="w-3.5 h-3.5" />
        Scan using any UPI app
      </p>
    </div>
  );
}
