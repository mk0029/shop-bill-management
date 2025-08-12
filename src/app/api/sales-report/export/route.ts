import { NextRequest, NextResponse } from "next/server";
import { sanityClient, queries } from "@/lib/sanity";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get("dateRange") || "month";
    const format = searchParams.get("format") || "json";

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
    const filteredBills = bills.filter((bill: any) => {
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

    // Calculate analytics
    const totalRevenue = filteredBills.reduce(
      (sum: number, bill: any) => sum + (bill.totalAmount || 0),
      0
    );

    const totalProfit = totalRevenue * 0.36; // Estimated profit margin
    const totalBills = filteredBills.length;
    const averageBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;

    // Service type breakdown
    const serviceTypes = new Map();
    filteredBills.forEach((bill: any) => {
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

        customerStats.set(customerId, {
          totalSpent: existing.totalSpent + (bill.totalAmount || 0),
          billCount: existing.billCount + 1,
          name: customerName,
        });
      }
    });

    const topCustomers = Array.from(customerStats.entries())
      .map(([customerId, stats]: [string, any]) => ({
        customerId,
        name: stats.name,
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
