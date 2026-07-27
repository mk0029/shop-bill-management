import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { safeUserName } from "@/lib/display-text";

type SanityBill = any;

interface BillPaymentSectionProps {
  selectedBill: SanityBill;
}

const shineAnimation = `
  @keyframes shine {
    0% {
      transform: translateX(100%) skewX(-20deg);
    }
    100% {
      transform: translateX(-100%) skewX(-20deg);
    }
  }
  
  .shine-button {
    position: relative;
    overflow: hidden;
  }
  
  .shine-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shine 2s infinite;
    pointer-events: none;
  }
`;

export function BillPaymentSection({ selectedBill }: BillPaymentSectionProps) {
  const [payLoading, setPayLoading] = useState(false);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

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

  const handlePayOnline = useCallback(
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
        setPayLoading(true);
        const total = Number(b.totalAmount || 0) || 0;
        const discount = Number(b.discount || 0) || 0;
        const paid = Number(b.paidAmount || 0) || 0;
        const actualPayableAmount = Math.max(0, total - discount);
        const balance = Math.max(0, actualPayableAmount - paid);
        if (balance <= 0) {
          toast.info("This bill is already fully paid.");
          return;
        }

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
          method: {
            upi: true,
            paylater: false,
            netbanking: true,
            card: false,
            wallet: true,
            emandate: false,
            emi: false,
          },
          upi: {
            flow: "otp",
          },
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
            } catch (e) {
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
      } catch (e) {
        toast.error("Payment failed to start");
      } finally {
        setPayLoading(false);
      }
    },
    [loadRazorpay],
  );
  const hide = true;
  return hide ? (
    ""
  ) : (
    <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
      <style>{shineAnimation}</style>
      <div className="flex gap-x-3 mb-3 items-center">
        <h4 className="font-medium text-white border">Pay Online</h4>
        <Badge
          variant="outline"
          className="shine-button border-white border-solid px-2! py-1! text-xs! font-medium "
        >
          New
        </Badge>
      </div>
      {(() => {
        const total = Number(selectedBill.totalAmount || 0) || 0;
        const discount = Number(selectedBill.discount || 0) || 0;
        const paid = Number(selectedBill.paidAmount || 0) || 0;
        const actualPayableAmount = Math.max(0, total - discount);
        const balance = Math.max(0, actualPayableAmount - paid);
        if (selectedBill.paymentStatus === "paid" || balance <= 0) return null;
        return (
          <div className="relative w-full overflow-hidden">
            <Button
              onClick={() => handlePayOnline(selectedBill)}
              disabled={payLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full relative shine-button"
            >
              {payLoading ? "Processing..." : `Pay ${formatCurrency(balance)}`}
            </Button>
          </div>
        );
      })()}
    </div>
  );
}
