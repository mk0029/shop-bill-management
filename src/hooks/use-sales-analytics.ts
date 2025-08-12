import { useBills, useCustomers } from "@/hooks/use-sanity-data";
import { useMemo } from "react";

export interface SalesAnalytics {
  totalRevenue: number;
  totalProfit: number;
  totalBills: number;
  averageBillValue: number;
  monthlyGrowth: number;
  topCustomers: Array<{
    name: string;
    totalSpent: number;
    billCount: number;
    customerId: string;
  }>;
  topItems: Array<{
    name: string;
    soldCount: number;
    revenue: number;
  }>;
  monthlyData: Array<{
    month: string;
    revenue: number;
    profit: number;
    bills: number;
  }>;
  serviceTypeBreakdown: Array<{
    type: string;
    count: number;
    revenue: number;
  }>;
  performanceInsights: {
    revenueGrowth: number;
    customerRetention: number;
    profitMargin: number;
  };
}

export function useSalesAnalytics(dateRange: string = "month"): {
  analytics: SalesAnalytics;
  isLoading: boolean;
} {
  const { bills, isLoading: billsLoading } = useBills();
  const { customers, isLoading: customersLoading } = useCustomers();

  const analytics = useMemo(() => {
    if (!bills.length) {
      return {
        totalRevenue: 0,
        totalProfit: 0,
        totalBills: 0,
        averageBillValue: 0,
        monthlyGrowth: 0,
        topCustomers: [],
        topItems: [],
        monthlyData: [],
        serviceTypeBreakdown: [],
        performanceInsights: {
          revenueGrowth: 0,
          customerRetention: 0,
          profitMargin: 0,
        },
      };
    }

    // Filter bills based on date range
    const now = new Date();
    const filteredBills = bills.filter((bill) => {
      const billDate = new Date(bill.createdAt);
      const diffTime = now.getTime() - billDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (dateRange) {
        case "week":
          return diffDays <= 7;
        case "month":
          return diffDays <= 30;
        case "quarter":
          return diffDays <= 90;
        case "year":
          return diffDays <= 365;
        default:
          return true;
      }
    });

    // Calculate basic metrics
    const totalRevenue = filteredBills.reduce(
      (sum, bill) => sum + (bill.totalAmount || 0),
      0
    );

    // Estimate profit (assuming 36% margin)
    const totalProfit = totalRevenue * 0.36;

    const totalBills = filteredBills.length;
    const averageBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;

    // Calculate monthly growth (compare with previous period)
    const previousPeriodBills = bills.filter((bill) => {
      const billDate = new Date(bill.createdAt);
      const diffTime = now.getTime() - billDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (dateRange) {
        case "week":
          return diffDays > 7 && diffDays <= 14;
        case "month":
          return diffDays > 30 && diffDays <= 60;
        case "quarter":
          return diffDays > 90 && diffDays <= 180;
        case "year":
          return diffDays > 365 && diffDays <= 730;
        default:
          return false;
      }
    });

    const previousRevenue = previousPeriodBills.reduce(
      (sum, bill) => sum + (bill.totalAmount || 0),
      0
    );

    const monthlyGrowth =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    // Calculate top customers
    const customerStats = new Map<
      string,
      { totalSpent: number; billCount: number; name: string }
    >();

    filteredBills.forEach((bill) => {
      if (bill.customer) {
        const customerId = bill.customer._id;
        const customerName = bill.customer.name || "Unknown Customer";
        const existing = customerStats.get(customerId) || {
          totalSpent: 0,
          billCount: 0,
          name: customerName,
        };

        customerStats.set(customerId, {
          totalSpent: existing.totalSpent + (bill.totalAmount || 0),
          billCount: existing.billCount + 1,
          name: customerName,
        });
      }
    });

    const topCustomers = Array.from(customerStats.entries())
      .map(([customerId, stats]) => ({
        customerId,
        name: stats.name,
        totalSpent: stats.totalSpent,
        billCount: stats.billCount,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Calculate top items
    const itemStats = new Map<string, { soldCount: number; revenue: number }>();

    filteredBills.forEach((bill) => {
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach((item: any) => {
          const itemName = item.productName || "Unknown Item";
          const existing = itemStats.get(itemName) || {
            soldCount: 0,
            revenue: 0,
          };

          itemStats.set(itemName, {
            soldCount: existing.soldCount + (item.quantity || 0),
            revenue: existing.revenue + (item.totalPrice || 0),
          });
        });
      }
    });

    const topItems = Array.from(itemStats.entries())
      .map(([name, stats]) => ({
        name,
        soldCount: stats.soldCount,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate monthly data (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString("en-US", { month: "short" });

      const monthBills = bills.filter((bill) => {
        const billDate = new Date(bill.createdAt);
        return (
          billDate.getMonth() === date.getMonth() &&
          billDate.getFullYear() === date.getFullYear()
        );
      });

      const monthRevenue = monthBills.reduce(
        (sum, bill) => sum + (bill.totalAmount || 0),
        0
      );

      monthlyData.push({
        month: monthName,
        revenue: monthRevenue,
        profit: monthRevenue * 0.36, // Estimated profit margin
        bills: monthBills.length,
      });
    }

    // Calculate service type breakdown
    const serviceTypes = new Map<string, { count: number; revenue: number }>();

    filteredBills.forEach((bill) => {
      const serviceType = bill.serviceType || "Unknown";
      const existing = serviceTypes.get(serviceType) || {
        count: 0,
        revenue: 0,
      };

      serviceTypes.set(serviceType, {
        count: existing.count + 1,
        revenue: existing.revenue + (bill.totalAmount || 0),
      });
    });

    const serviceTypeBreakdown = Array.from(serviceTypes.entries()).map(
      ([type, stats]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count: stats.count,
        revenue: stats.revenue,
      })
    );

    // Calculate performance insights
    const uniqueCustomers = new Set(
      filteredBills.map((bill) => bill.customer?._id).filter(Boolean)
    ).size;

    const repeatCustomers = Array.from(customerStats.values()).filter(
      (customer) => customer.billCount > 1
    ).length;

    const customerRetention =
      uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

    const profitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalProfit,
      totalBills,
      averageBillValue,
      monthlyGrowth,
      topCustomers,
      topItems,
      monthlyData,
      serviceTypeBreakdown,
      performanceInsights: {
        revenueGrowth: monthlyGrowth,
        customerRetention,
        profitMargin,
      },
    };
  }, [bills, customers, dateRange]);

  return {
    analytics,
    isLoading: billsLoading || customersLoading,
  };
}
