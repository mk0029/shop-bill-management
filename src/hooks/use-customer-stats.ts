import { useMemo } from "react";
import { useCustomers, useBills } from "@/hooks/use-sanity-data";
import type { CustomerWithStats, CustomerStats } from "@/types/customer";

export function useCustomerStats() {
  const { customers, isLoading: customersLoading } = useCustomers();
  const { bills, isLoading: billsLoading } = useBills();

  const customersWithStats: CustomerWithStats[] = useMemo(() => {
    return customers.map((customer) => {
      const customerBills = bills.filter(
        (bill) => bill.customer?._id === customer._id
      );
      const totalBills = customerBills.length;
      const totalSpent = customerBills.reduce((sum, bill) => {
        if (bill.paymentStatus === "paid") {
          return sum + (bill.totalAmount || 0);
        } else if (bill.paymentStatus === "partial") {
          return sum + (bill.paidAmount || 0);
        }
        return sum;
      }, 0);
      const lastBill = customerBills.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      return {
        ...customer,
        totalBills,
        totalSpent,
        lastBillDate: lastBill ? lastBill.createdAt.split("T")[0] : null,
      };
    });
  }, [customers, bills]);

  const stats: CustomerStats = useMemo(() => {
    return {
      totalCustomers: customersWithStats.length,
      activeCustomers: customersWithStats.filter((c) => c.isActive).length,
      totalBills: customersWithStats.reduce((sum, c) => sum + c.totalBills, 0),
      totalRevenue: customersWithStats.reduce(
        (sum, c) => sum + c.totalSpent,
        0
      ),
    };
  }, [customersWithStats]);

  const isLoading = customersLoading || billsLoading;

  return {
    customersWithStats,
    stats,
    isLoading,
  };
}
