import { NextRequest, NextResponse } from "next/server";
import { sanityClient, queries } from "@/lib/sanity";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get("dateRange") || "month";
    const format = searchParams.get("format") || "json";
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const paymentStatusesParam = searchParams.get("paymentStatuses");
    const serviceTypesParam = searchParams.get("serviceTypes");
    const filterPaymentStatuses = paymentStatusesParam
      ? paymentStatusesParam.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];
    const filterServiceTypes = serviceTypesParam
      ? serviceTypesParam.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    // Fetch bills data
    const bills = await sanityClient.fetch(queries.bills);

    if (!bills || bills.length === 0) {
      return NextResponse.json(
        { error: "No sales data available" },
        { status: 404 }
      );
    }

    // Filter bills based on date range
    const now = new Date();
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
          const from = fromParam ? new Date(fromParam) : undefined;
          const to = toParam ? new Date(toParam) : undefined;
          inRange = true;
          if (from && billDate < from) inRange = false;
          if (to) {
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

      if (filterPaymentStatuses.length > 0) {
        const ps = normalizeStatus(bill.paymentStatus);
        if (!filterPaymentStatuses.includes(ps)) return false;
      }

      if (filterServiceTypes.length > 0) {
        const st = (bill.serviceType || bill.locationType || "").toLowerCase();
        if (!filterServiceTypes.includes(st)) return false;
      }

      return true;
    });

    // Calculate analytics (recognized revenue: paid + partial)
    const totalRevenue = filteredBills.reduce((sum: number, bill: any) => sum + recognizedRevenueForBill(bill), 0);

    // Try to compute profit from items if we have cost info; otherwise fallback 36%
    const { revenueFromItems, costFromItems } = filteredBills.reduce(
      (acc: { revenueFromItems: number; costFromItems: number }, bill: any) => {
        if (!Array.isArray(bill.items)) return acc;
        for (const item of bill.items) {
          const qty = Number(item.quantity) || 0;
          const itemRevenue =
            Number(item.totalPrice ?? item.total ?? 0) ||
            (Number(item.unitPrice ?? item.price ?? 0) * qty);
          const costPrice = Number(
            item.product?.pricing?.costPrice ?? item.product?.pricing?.purchasePrice ?? 0
          );
          acc.revenueFromItems += itemRevenue;
          acc.costFromItems += costPrice * qty;
        }
        return acc;
      },
      { revenueFromItems: 0, costFromItems: 0 }
    );

    const totalProfit = costFromItems > 0
      ? Math.max(revenueFromItems - costFromItems, 0)
      : totalRevenue * 0.36; // Estimated profit margin if cost unknown
    const totalBills = filteredBills.length;
    const averageBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;

    // Service type breakdown
    const serviceTypes = new Map();
    filteredBills.forEach((bill: any) => {
      const serviceType = bill.serviceType || bill.locationType || "Unknown";
      const existing = serviceTypes.get(serviceType) || {
        count: 0,
        revenue: 0,
      };
      const recognized = recognizedRevenueForBill(bill);
      serviceTypes.set(serviceType, {
        count: existing.count + 1,
        revenue: existing.revenue + recognized,
      });
    });

    const serviceTypeBreakdown = Array.from(serviceTypes.entries()).map(
      ([type, stats]: [string, any]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count: stats.count,
        revenue: stats.revenue,
      })
    );

    // Top customers
    const customerStats = new Map();
    filteredBills.forEach((bill: any) => {
      if (bill.customer) {
        const customerId = bill.customer._id;
        const customerName = bill.customer.name || "Unknown Customer";
        const existing = customerStats.get(customerId) || {
          totalSpent: 0,
          billCount: 0,
          name: customerName,
        };

        const recognized = recognizedRevenueForBill(bill);

        customerStats.set(customerId, {
          totalSpent: existing.totalSpent + recognized,
          billCount: existing.billCount + 1,
          name: customerName,
        });
      }
    });

    const topCustomers = Array.from(customerStats.entries())
      .map(([customerId, stats]: [string, any]) => ({
        customerId,
        name: stats.name,
        // Ensure we report billed totals in export just like UI ranking
        totalSpent: stats.totalSpent,
        billCount: stats.billCount,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange,
      summary: {
        totalRevenue,
        totalProfit,
        totalBills,
        averageBillValue,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      },
      serviceTypeBreakdown,
      topCustomers,
      bills: filteredBills.map((bill: any) => ({
        billNumber: bill.billNumber,
        customerName: bill.customer?.name || "Unknown",
        serviceType: bill.serviceType,
        totalAmount: bill.totalAmount,
        paymentStatus: bill.paymentStatus,
        createdAt: bill.createdAt,
      })),
    };

    if (format === "csv") {
      // Generate CSV format
      const csvHeaders = [
        "Bill Number",
        "Customer Name",
        "Service Type",
        "Total Amount",
        "Payment Status",
        "Date",
      ];

      const csvRows = filteredBills.map((bill: any) => [
        bill.billNumber || "",
        bill.customer?.name || "Unknown",
        bill.serviceType || "",
        bill.totalAmount || 0,
        bill.paymentStatus || "",
        new Date(bill.createdAt).toLocaleDateString(),
      ]);

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row: any) => row.join(",")),
      ].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="sales-report-${dateRange}-${
            new Date().toISOString().split("T")[0]
          }.csv"`,
        },
      });
    }

    // Return JSON format
    return NextResponse.json(reportData);
  } catch (error) {
    console.error("Error generating sales report:", error);
    return NextResponse.json(
      { error: "Failed to generate sales report" },
      { status: 500 }
    );
  }
}
