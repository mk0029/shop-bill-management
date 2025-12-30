import { CheckCircle, Clock, AlertCircle } from "lucide-react";

type SanityBill = any;

interface BillItemProps {
  bill: SanityBill;
  onClick: (bill: SanityBill) => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "paid":
      return CheckCircle;
    case "pending":
      return Clock;
    case "overdue":
      return AlertCircle;
    default:
      return Clock;
  }
};

const getBillStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-500/20 text-green-400";
    case "partial":
      return "bg-yellow-800/20 text-yellow-400";
    case "overdue":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-yellow-500 text-yellow-900";
  }
};

export function BillItem({ bill, onClick }: BillItemProps) {
  const statusColor = getBillStatusColor(bill.paymentStatus || bill.status);
  const StatusIcon = getStatusIcon(bill.paymentStatus || bill.status);

  return (
    <div
      className="p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
      onClick={() => onClick(bill)}>
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <StatusIcon />
            <span className="font-medium text-white">#{bill.billNumber}</span>
            <span
              className={`text-xs px-2 py-1 rounded-full capitalize ${statusColor}`}>
              {bill.paymentStatus || bill.status}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {new Date(bill.serviceDate || bill.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          {(() => {
            const total = Number(bill.totalAmount || 0) || 0;
            const discount = Number(bill.discount || 0) || 0;
            const paid = Number(bill.paidAmount || 0) || 0;
            const actualPayableAmount = Math.max(0, total - discount);
            const balance = Math.max(0, actualPayableAmount - paid);
            const isFullyPaid = balance <= 0;
            
            return (
              <>
                <p
                  className={` ${isFullyPaid ? "text-green-400 font-medium" : "text-white font-light text-sm"} `}>
                {!isFullyPaid&&'Total '}  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                    .format(
                      isFullyPaid
                        ? total
                        : total
                    )
                    .replace("₹", "₹")}
                </p>
{ !isFullyPaid&&                <p
                  className={` ${isFullyPaid ? "text-green-400" : "text-yellow-300"} font-medium`}>
                Pending  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                    .format(  total-discount )
                    .replace("₹", "₹")}
                </p>}
                {bill.paymentStatus === "paid" ? (
                  <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                    Paid
                  </span>
                ) : (
                  <p className="text-xs text-gray-400">
                    {bill.paymentStatus === "partial"
                      ? `Paid: ${new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(paid || 0)} of ${new Intl.NumberFormat(
                          "en-IN",
                          {
                            style: "currency",
                            currency: "INR",
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        ).format(total || 0)}`
                      : ""}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
