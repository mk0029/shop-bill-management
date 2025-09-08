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
    pending?: number;
  }>;
  allCustomers?: Array<{
    name: string;
    totalSpent: number;
    billCount: number;
    customerId: string;
    pending?: number;
  }>;
  topItems: Array<{
    name: string;
    soldCount: number;
    revenue: number;
  }>;
  allItems?: Array<{
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
  bills?: any[];
}

export function useSalesAnalytics(
  dateRange: string = "month",
  options?: {
    from?: string | Date;
    to?: string | Date;
    paymentStatuses?: string[]; // ["paid","partial","pending","overdue"]
    serviceTypes?: string[]; // filter by serviceType/locationType
    mode?: "received" | "billed"; // controls how revenue is computed
  }
): {
  analytics: SalesAnalytics;
  isLoading: boolean;
} {
  const { bills, isLoading: billsLoading } = useBills();
  const { customers, isLoading: customersLoading } = useCustomers();

  // Helper: normalize payment status and compute recognized revenue
  const normalizeStatus = (status: unknown): "paid" | "partial" | "pending" | "overdue" | "other" => {
    const s = String(status || "").trim().toLowerCase();
    if (["paid", "success", "completed", "complete", "settled"].includes(s)) return "paid";
    if (["partial", "partially_paid", "partially-paid", "partially", "half", "advance"].includes(s)) return "partial";
    if (["pending", "unpaid", "due"].includes(s)) return "pending";
    if (["overdue"].includes(s)) return "overdue";
    return "other";
  };

  const recognizedRevenueForBill = (bill: any): number => {
    const status = normalizeStatus(bill?.paymentStatus);
    const total = Number(bill?.totalAmount || 0);
    const paid = Number(bill?.paidAmount || 0);
    if (status === "paid") return total;
    if (status === "partial") return paid;
    return 0;
  };

  const revenueForBill = (bill: any): number => {
    return options?.mode === "billed"
      ? Number(bill?.totalAmount || 0)
      : recognizedRevenueForBill(bill);
  };

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
    const filteredBills = bills.filter((bill: any) => {
      const billDate = new Date(bill.createdAt);
      const diffTime = now.getTime() - billDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let inRange = true;
      switch (dateRange) {
        case "week":
          inRange = diffDays <= 7;
          break;
        case "month":
          inRange = diffDays <= 30;
          break;
        case "quarter":
          inRange = diffDays <= 90;
          break;
        case "year":
          inRange = diffDays <= 365;
          break;
        case "custom": {
          const from = options?.from ? new Date(options.from) : undefined;
          const to = options?.to ? new Date(options.to) : undefined;
          inRange = true;
          if (from && billDate < from) inRange = false;
          if (to) {
            // include entire day for 'to'
            const toEnd = new Date(to);
            toEnd.setHours(23, 59, 59, 999);
            if (billDate > toEnd) inRange = false;
          }
          break;
        }
        default:
          inRange = true;
      }

      if (!inRange) return false;

      // optional filters: paymentStatuses
      if (options?.paymentStatuses && options.paymentStatuses.length > 0) {
        if (!options.paymentStatuses.includes((bill.paymentStatus || "").toLowerCase())) {
          return false;
        }
      }

      // optional filters: serviceTypes
      if (options?.serviceTypes && options.serviceTypes.length > 0) {
        const st = (bill.serviceType || bill.locationType || "").toLowerCase();
        const has = options.serviceTypes.map((s) => s.toLowerCase()).includes(st);
        if (!has) return false;
      }

      return true;
    });

    // Calculate basic metrics
    // Recognized revenue logic:
    // - paid: take full totalAmount
    // - partial: take paidAmount
    // - pending/others: 0 (not recognized yet)
    const totalRevenue = filteredBills.reduce((sum, bill: any) => sum + revenueForBill(bill), 0);

    // Profit: prefer computing from line-items if cost data is available.
    // Fallback to a 36% margin on recognized revenue when cost cannot be derived.
    const { revenueFromItems, costFromItems } = filteredBills.reduce(
      (acc, bill: any) => {
        if (!Array.isArray(bill.items)) return acc;
        for (const item of bill.items) {
          const qty = Number(item.quantity) || 0;
          // Revenue per item: prefer totalPrice/total; fallback to unitPrice*qty
          const itemRevenue =
            Number(item.totalPrice ?? item.total ?? 0) ||
            (Number(item.unitPrice ?? item.price ?? 0) * qty);
          // Cost per item: try product.pricing.costPrice or purchasePrice
          const costPrice =
            Number(item.product?.pricing?.costPrice ?? item.product?.pricing?.purchasePrice ?? 0);
          const itemCost = costPrice * qty;
          acc.revenueFromItems += itemRevenue;
          acc.costFromItems += itemCost;
        }
        return acc;
      },
      { revenueFromItems: 0, costFromItems: 0 }
    );

    // If we have any cost data, use it to compute profit; otherwise fallback
    const totalProfit = costFromItems > 0
      ? Math.max(revenueFromItems - costFromItems, 0)
      : totalRevenue * 0.36;

    const totalBills = filteredBills.length;
    const averageBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;

    // Calculate monthly growth (compare with previous period)
    // Previous period is defined as the same window immediately before the current one
    const previousPeriodBills = bills.filter((bill: any) => {
      const billDate = new Date(bill.createdAt);
      const diffTime = now.getTime() - billDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let inPrev = false;
      switch (dateRange) {
        case "week":
          inPrev = diffDays > 7 && diffDays <= 14;
          break;
        case "month":
          inPrev = diffDays > 30 && diffDays <= 60;
          break;
        case "quarter":
          inPrev = diffDays > 90 && diffDays <= 180;
          break;
        case "year":
          inPrev = diffDays > 365 && diffDays <= 730;
          break;
        case "custom": {
          const fromDate = options?.from ? new Date(options.from) : undefined;
          const toDate = options?.to ? new Date(options.to) : undefined;
          if (fromDate && toDate) {
            const windowMs = toDate.getTime() - fromDate.getTime();
            const prevFrom = new Date(fromDate.getTime() - windowMs - 1);
            const prevTo = new Date(fromDate.getTime() - 1);
            inPrev = billDate >= prevFrom && billDate <= prevTo;
          }
          break;
        }
        default:
          inPrev = false;
      }

      if (!inPrev) return false;
      // Apply same optional filters
      if (options?.paymentStatuses && options.paymentStatuses.length > 0) {
        if (!options.paymentStatuses.includes((bill.paymentStatus || "").toLowerCase())) {
          return false;
        }
      }
      if (options?.serviceTypes && options.serviceTypes.length > 0) {
        const st = (bill.serviceType || bill.locationType || "").toLowerCase();
        const has = options.serviceTypes.map((s) => s.toLowerCase()).includes(st);
        if (!has) return false;
      }
      return true;
    });

    const previousRevenue = previousPeriodBills.reduce((sum, bill: any) => sum + revenueForBill(bill), 0);

    const monthlyGrowth =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : totalRevenue > 0
        ? 100
        : 0;

    // Calculate top customers
    const customerStats = new Map<
      string,
      { totalSpent: number; billCount: number; name: string; pending: number }
    >();

    filteredBills.forEach((bill: any) => {
      if (bill.customer) {
        const customerId = bill.customer._id;
        const customerName = bill.customer.name || "Unknown Customer";
        const existing = customerStats.get(customerId) || {
          totalSpent: 0,
          billCount: 0,
          name: customerName,
          pending: 0,
        };
        const status = normalizeStatus(bill?.paymentStatus);
        const total = Number(bill?.totalAmount || 0);
        const paid = Number(bill?.paidAmount || 0);
        let addPaid = 0;
        let addPending = 0;
        if (status === "paid") {
          addPaid = total;
        } else if (status === "partial") {
          addPaid = paid;
          addPending = Math.max(total - paid, 0);
        } else if (status === "pending" || status === "overdue" || status === "other") {
          addPaid = 0;
          addPending = total;
        }
        // In billed mode, show paid portion as totalSpent and keep pending separately
        const newTotal = existing.totalSpent + (options?.mode === "billed" ? addPaid : revenueForBill(bill));
        customerStats.set(customerId, {
          totalSpent: newTotal,
          billCount: existing.billCount + 1,
          name: customerName,
          pending: existing.pending + addPending,
        });
      }
    });

    const allCustomersList = Array.from(customerStats.entries())
      .map(([customerId, stats]) => ({
        customerId,
        name: stats.name,
        totalSpent: stats.totalSpent,
        billCount: stats.billCount,
        pending: stats.pending,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);
    const topCustomers = allCustomersList.slice(0, 5);

    // Calculate top items
    const itemStats = new Map<string, { soldCount: number; revenue: number }>();

    filteredBills.forEach((bill: any) => {
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach((item: any) => {
          const itemName =
            item.product?.name || item.productName || item.name || "Unknown Item";
          const existing = itemStats.get(itemName) || {
            soldCount: 0,
            revenue: 0,
          };

          const qty = Number(item.quantity) || 0;
          const itemRevenue =
            Number(item.totalPrice ?? item.total ?? 0) ||
            (Number(item.unitPrice ?? item.price ?? 0) * qty);

          itemStats.set(itemName, {
            soldCount: existing.soldCount + qty,
            revenue: existing.revenue + itemRevenue,
          });
        });
      }
    });

    const allItemsList = Array.from(itemStats.entries())
      .map(([name, stats]) => ({
        name,
        soldCount: stats.soldCount,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);
    const topItems = allItemsList.slice(0, 5);

    // Calculate monthly data (last 6 months)
    const monthlyData: SalesAnalytics["monthlyData"] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString("en-US", { month: "short" });

      const monthBills = bills.filter((bill: any) => {
        const billDate = new Date(bill.createdAt);
        return (
          billDate.getMonth() === date.getMonth() &&
          billDate.getFullYear() === date.getFullYear()
        );
      });

      // Monthly trend respects current mode
      const monthRevenue = monthBills.reduce((sum, bill: any) => sum + (options?.mode === "billed" ? Number(bill.totalAmount || 0) : recognizedRevenueForBill(bill)), 0);

      const monthCost = monthBills.reduce((cost, bill: any) => {
        if (!Array.isArray(bill.items)) return cost;
        for (const it of bill.items) {
          const qty = Number(it.quantity) || 0;
          const c = Number(it.product?.pricing?.costPrice ?? it.product?.pricing?.purchasePrice ?? 0);
          cost += c * qty;
        }
        return cost;
      }, 0);

      const monthProfit = monthCost > 0 ? Math.max(monthRevenue - monthCost, 0) : monthRevenue * 0.36;

      monthlyData.push({
        month: monthName,
        revenue: monthRevenue,
        profit: monthProfit,
        bills: monthBills.length,
      });
    }

    // Calculate service type breakdown
    const serviceTypes = new Map<string, { count: number; revenue: number }>();

    filteredBills.forEach((bill: any) => {
      const serviceType = bill.serviceType || bill.locationType || "Unknown";
      const existing = serviceTypes.get(serviceType) || {
        count: 0,
        revenue: 0,
      };

      const recognized = revenueForBill(bill);

      serviceTypes.set(serviceType, {
        count: existing.count + 1,
        revenue: existing.revenue + recognized,
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
    // Customer retention: proportion of current unique customers who also purchased in previous period
    const currentCustomerIds = new Set(
      filteredBills.map((bill: any) => bill.customer?._id).filter(Boolean)
    );
    const prevCustomerIds = new Set(
      previousPeriodBills.map((bill: any) => bill.customer?._id).filter(Boolean)
    );
    let returningCount = 0;
    currentCustomerIds.forEach((id) => {
      if (prevCustomerIds.has(id)) returningCount += 1;
    });
    const uniqueCustomers = currentCustomerIds.size;
    const customerRetention = uniqueCustomers > 0 ? (returningCount / uniqueCustomers) * 100 : 0;

    const profitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalProfit,
      totalBills,
      averageBillValue,
      monthlyGrowth,
      topCustomers,
      allCustomers: allCustomersList,
      topItems,
      allItems: allItemsList,
      monthlyData,
      serviceTypeBreakdown,
      performanceInsights: {
        revenueGrowth: monthlyGrowth,
        customerRetention,
        profitMargin,
      },
      bills: filteredBills,
    };
  }, [bills, customers, dateRange, options?.from, options?.to, options?.paymentStatuses, options?.serviceTypes, options?.mode]);

  return {
    analytics,
    isLoading: billsLoading || customersLoading,
  };
}
