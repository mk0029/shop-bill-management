import { CheckCircle, Clock, AlertCircle, Receipt, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { checkPaymentsDisabled } from "@/lib/payments-config";

type SanityBill = any;

interface BillItemProps {
  bill: SanityBill;
  onClick: (bill: SanityBill) => void;
  onUPIPayment?: (bill: SanityBill) => void;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; label: string; bg: string; text: string; dot: string }> = {
  paid: {
    icon: CheckCircle,
    label: "Paid",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  partial: {
    icon: Clock,
    label: "Partial",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    dot: "bg-orange-400",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    bg: "bg-red-500/10",
    text: "text-red-400",
    dot: "bg-red-400",
  },
  overdue: {
    icon: AlertCircle,
    label: "Overdue",
    bg: "bg-red-500/10",
    text: "text-red-400",
    dot: "bg-red-400",
  },
};

function getStatus(status: string | undefined) {
  const s = (status || "pending").toLowerCase();
  return statusConfig[s] || statusConfig.pending;
}

export function BillItem({ bill, onClick, onUPIPayment }: BillItemProps) {
  const isPaid = (bill.paymentStatus || "").toLowerCase() === "paid";
  const st = getStatus(bill.paymentStatus);
  const StatusIcon = st.icon;

  const total = Number(bill.totalAmount || 0) || 0;
  const paid = Number(bill.paidAmount || 0) || 0;
  const balance = bill.balanceAmount != null ? Number(bill.balanceAmount) : Math.max(0, total - paid);
  const displayAmount = bill.paymentStatus === "partial" ? balance : total;

  const serviceLabel = (bill.serviceType || "Service").replace(/_/g, " ");
  const dateStr = bill.serviceDate
    ? new Date(bill.serviceDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : bill.createdAt
      ? new Date(bill.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "";

  return (
    <Card
      className="bg-gray-800/80 border-gray-700/60 hover:bg-gray-800 transition-colors cursor-pointer overflow-hidden"
      onClick={() => onClick(bill)}
      role="button"
      aria-label={`View details for bill ${bill.billNumber}`}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: icon + bill info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", st.bg)}>
              <StatusIcon className={cn("w-4.5 h-4.5", st.text)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-white text-sm truncate">
                  Bill #{bill.billNumber}
                </h3>
                {!isPaid && onUPIPayment && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (checkPaymentsDisabled()) return;
                      onUPIPayment(bill);
                    }}
                    disabled={checkPaymentsDisabled()}
                    className={cn(
                      "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all text-white text-[11px] font-medium",
                      checkPaymentsDisabled()
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-500 active:scale-95"
                    )}
                  >
                    <Smartphone className="w-3 h-3" />
                    {checkPaymentsDisabled() ? "Unavailable" : "Pay"}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate capitalize mt-0.5">{serviceLabel}</p>
              {dateStr && <p className="text-xs text-gray-500">{dateStr}</p>}
            </div>
          </div>

          {/* Right: amount + status */}
          <div className="text-right shrink-0">
            <p className="text-base font-bold text-white tabular-nums">
              ₹{displayAmount.toLocaleString()}
            </p>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
              <span className={cn("text-[11px] font-medium", st.text)}>{st.label}</span>
            </div>
            {bill.paymentStatus === "partial" && paid > 0 && (
              <p className="text-[10px] text-gray-500 mt-0.5">Paid: ₹{paid.toLocaleString()}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
