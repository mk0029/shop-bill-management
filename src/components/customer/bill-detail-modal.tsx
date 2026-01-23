"use client";
import { BillDetailModal as BaseBillDetailModal } from "@/components/ui/bill-detail-modal";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface BillDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  currency: string;
  getBillStatusColor: (status: string) => string;
  getTotalAmount: (bill: any) => number;
  getServiceTypeLabel: (serviceType: string) => string;
  onDownloadBill: (bill: any) => void;
}

export const BillDetailModal = ({
  isOpen,
  onClose,
  bill,
  currency,
  getBillStatusColor,
  getTotalAmount,
  getServiceTypeLabel,
  onDownloadBill,
}: BillDetailModalProps) => {
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

  const onPayOnline = useCallback(
    async (b: any) => {
      try {
        if (!b) return;
        if (typeof window === "undefined") return;
        const key =
          process.env.RAZORPAY_KEY_ID || (window as any).RAZORPAY_KEY_ID;
        if (!key) {
          toast.error("Payment key not configured. Set RAZORPAY_KEY_ID.");
          return;
        }
        setLoading(true);
        const total = Number(b.totalAmount || 0) || 0;
        const paid = Number(b.paidAmount || 0) || 0;
        const balance = Math.max(0, total - paid);
        if (balance <= 0) {
          toast.info("This bill is already fully paid.");
          return;
        }

        // 1) Create order on server
        const orderRes = await fetch("/api/payments/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billId: String(b._id || b.id || b.billId),
            amount: balance,
          }),
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
          description: b.billNumber
            ? `Payment for ${b.billNumber}`
            : "Bill Payment",
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
            } catch (e) {
              toast.error("Verification failed");
            }
          },
          modal: { ondismiss: () => {} },
          prefill: {
            name: b?.customer?.name || "",
            email: b?.customer?.email || "",
            contact: b?.customer?.phone || "",
          },
        };

        const rz = new (window as any).Razorpay(options);
        rz.open();
      } catch (e) {
        toast.error("Payment failed to start");
      } finally {
        setLoading(false);
      }
    },
    [loadRazorpay, onClose],
  );
  return (
    <BaseBillDetailModal
      isOpen={isOpen}
      onClose={onClose}
      bill={bill}
      onDownloadPDF={onDownloadBill}
      showShareButton={false}
      // Pay button is rendered by the shared modal when this prop is provided and bill is unpaid
      onPayOnline={onPayOnline}
    />
  );
};
