import { Card, CardContent } from "@/components/ui/card";
import { Receipt, CheckCircle, Clock } from "lucide-react";
import { useMemo } from "react";

interface BillStats {
  total: number;
  paid: number;
  pending: number;
  partial: number;
  overdue: number;
  totalAmount: number;
  totalDiscount: number;
  totalPayableAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

interface CustomerBillStatsProps {
  bills: any[];
}

export function CustomerBillStats({ bills = [] }: CustomerBillStatsProps) {
  const stats: BillStats = useMemo(() => {
    const total = bills.length;

    const paidBills = bills.filter((bill) => bill.paymentStatus === "paid");
    const pendingBills = bills.filter(
      (bill) => bill.paymentStatus === "pending"
    );
    const partialBills = bills.filter(
      (bill) => bill.paymentStatus === "partial"
    );
    const overdueBills = bills.filter(
      (bill) => bill.paymentStatus === "overdue"
    );

    const totalAmount = bills.reduce(
      (sum, bill) => sum + (bill.totalAmount || 0),
      0
    );

    const totalDiscount = bills.reduce(
      (sum, bill) => sum + (bill.discount || 0),
      0
    );

    const totalPayableAmount = bills.reduce((sum, bill) => {
      const total = Number(bill.totalAmount || 0) || 0;
      const discount = Number(bill.discount || 0) || 0;
      return sum + Math.max(0, total - discount);
    }, 0);

    const paidAmount = bills.reduce((sum, bill) => {
      const total = Number(bill.totalAmount || 0) || 0;
      const discount = Number(bill.discount || 0) || 0;
      const actualPayableAmount = Math.max(0, total - discount);
      
      if (bill.paymentStatus === "paid") {
        return sum + actualPayableAmount;
      } else if (bill.paymentStatus === "partial") {
        return sum + (bill.paidAmount || 0);
      }
      return sum;
    }, 0);

    const pendingAmount = bills.reduce((sum, bill) => {
      const total = Number(bill.totalAmount || 0) || 0;
      const discount = Number(bill.discount || 0) || 0;
      const paid = Number(bill.paidAmount || 0) || 0;
      const actualPayableAmount = Math.max(0, total - discount);
      const balance = Math.max(0, actualPayableAmount - paid);
      
      if (bill.paymentStatus === "pending") {
        return sum + actualPayableAmount;
      } else if (bill.paymentStatus === "partial") {
        return sum + balance;
      }
      return sum;
    }, 0);

    return {
      total,
      paid: paidBills.length,
      pending: pendingBills.length,
      partial: partialBills.length,
      overdue: overdueBills.length,
      totalAmount,
      totalDiscount,
      totalPayableAmount,
      paidAmount,
      pendingAmount,
    };
  }, [bills]);

  const statsConfig = [
    {
      title: "Total Amount",
      value: `₹${stats.totalAmount.toLocaleString()}`,
      subtitle: `${stats.total} total bills`,
      subtitleColor: "text-gray-400",
      icon: Receipt,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Discount",
      value: `₹${stats.totalDiscount.toLocaleString()}`,
      subtitle: "Total discount given",
      subtitleColor: "text-purple-400",
      icon: Clock,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Paid Amount",
      value: `₹${stats.paidAmount.toLocaleString()}`,
      subtitle: `${stats.paid} paid`,
      subtitleColor: "text-green-600",
      icon: CheckCircle,
      iconColor: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Pending Amount",
      value: `₹${stats.pendingAmount.toLocaleString()}`,
      subtitle: `${stats.pending} pending, ${stats.partial} partial`,
      subtitleColor: "text-yellow-500",
      icon: Clock,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {statsConfig.map((stat, index) => (
        <Card
          key={index}
          className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-400 font-medium truncate">
                  {stat.title}
                </p>
                <p
                  className={`text-xl sm:text-2xl font-bold mt-1 truncate ${stat.iconColor}`}>
                  {stat.value}
                </p>
                <p className={`text-xs ${stat.subtitleColor} truncate`}>
                  {stat.subtitle}
                </p>
              </div>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.iconColor}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
