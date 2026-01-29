import { CheckCircle, Clock, AlertCircle, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/components/customer/bill-utils";

type SanityBill = any;

interface BillItemProps {
  bill: SanityBill;
  onClick: (bill: SanityBill) => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "paid":
    case "completed":
      return CheckCircle;
    case "pending":
    case "partial":
      return Clock;
    case "overdue":
      return AlertCircle;
    default:
      return Receipt;
  }
};

export function BillItem({ bill, onClick }: BillItemProps) {
  const StatusIcon = getStatusIcon(bill.paymentStatus || bill.status);

  const total = Number(bill.totalAmount || 0) || 0;
  const paid = Number(bill.paidAmount || 0) || 0;
  const balance =
    bill.balanceAmount != null
      ? Number(bill.balanceAmount)
      : Math.max(0, total - paid);

  return (
    <Card
      className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
      onClick={() => onClick(bill)}
      role="button"
      aria-label={`View details for bill ${bill.billNumber}`}
    >
      <CardContent className="p-2 sm:p-4">
        <div className="flex flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="max-md:hidden w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <StatusIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-white truncate capitalize">
                {`Bill #${bill.billNumber}`}
              </h3>
              <p className="text-sm text-gray-400 truncate capitalize">
                {(bill.serviceType || "Service").replace(/_/g, " ")}
              </p>
              <p className="text-sm text-gray-400">
                {bill.serviceDate
                  ? new Date(bill.serviceDate).toLocaleDateString()
                  : new Date(bill.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
            <div className="text-left sm:text-right">
              <p className="font-semibold text-white text-lg">
                ₹
                {(bill.paymentStatus === "partial"
                  ? balance
                  : total
                )?.toLocaleString() || 0}
              </p>
              <div className="flex flex-col sm:items-end gap-1 mt-1">
                {bill.paymentStatus === "partial" && paid > 0 && (
                  <p className="text-xs text-gray-300">
                    ₹{paid.toLocaleString()} paid
                  </p>
                )}
                <Badge
                  className={getStatusColor(bill.paymentStatus || bill.status)}
                >
                  {bill.paymentStatus || bill.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
