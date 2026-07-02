"use client";

import { useCallback, useState } from "react";
import { BillDetailModal as BaseBillDetailModal } from "@/components/ui/bill-detail-modal";
import { toast } from "sonner";
import { safeUserName } from "@/lib/display-text";

interface BillDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBill: any;
  formatCurrency?: (value: number) => string;
  getStatusColor?: (status: string) => string;
}

export function BillDetailsModal({
  isOpen,
  onClose,
  selectedBill,
}: BillDetailsModalProps) {
  const [loading, setLoading] = useState(false);

  const loadRazorpay = useCallback(async () => {
    if (typeof window === "undefined") return false;
    if ((window as any).Razorpay) return true;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Razorpay"));
      document.body.appendChild(s);
    });
    return Boolean((window as any).Razorpay);
  }, []);

  const onPayOnline = useCallback(async (b: any) => {
    try {
      if (!b) return;
      if (typeof window === "undefined") return;
      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || (window as any).NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) {
        toast.error("Payment key not configured.");
        return;
      }
      setLoading(true);
      const total = Number(b.totalAmount || 0) || 0;
      const paid = Number(b.paidAmount || 0) || 0;
      const discount = Number(b.discount || 0) || 0;
      const balance = Math.max(0, total - discount - paid);
      if (balance <= 0) {
        toast.info("This bill is already fully paid.");
        return;
      }

      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId: String(b._id || b.id || b.billId), amount: balance }),
      });
      const orderJson = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok || !orderJson?.order?.id) {
        toast.error("Failed to start payment.");
        return;
      }

      const ok = await loadRazorpay();
      if (!ok) {
        toast.error("Unable to load payment SDK.");
        return;
      }

      const options: any = {
        key,
        order_id: orderJson.order.id,
        name: "Jambh Electrics",
        description: b.billNumber ? `Payment for ${b.billNumber}` : "Bill Payment",
        theme: { color: "#059669" },
        handler: async (resp: any) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                billId: String(b._id || b.id || b.billId),
                amount: balance,
              }),
            });
            const verifyJson = await verifyRes.json().catch(() => ({}));
            if (!verifyRes.ok || verifyJson?.success === false) {
              toast.error(verifyJson?.error || "Payment verification failed");
              return;
            }
            toast.success("Payment successful");
            onClose();
          } catch {
            toast.error("Verification failed");
          }
        },
        modal: { ondismiss: () => {} },
        prefill: {
          name: safeUserName(b?.customer?.name, ""),
          email: b?.customer?.email || "",
          contact: b?.customer?.phone || "",
        },
      };

      const rz = new (window as any).Razorpay(options);
      rz.open();
    } catch {
      toast.error("Payment failed to start");
    } finally {
      setLoading(false);
    }
  }, [loadRazorpay, onClose]);

  if (!selectedBill) return null;

  return (
    <BaseBillDetailModal
      isOpen={isOpen}
      onClose={onClose}
      bill={selectedBill}
      onPayOnline={onPayOnline}
      role="customer"
    />
  );
}
