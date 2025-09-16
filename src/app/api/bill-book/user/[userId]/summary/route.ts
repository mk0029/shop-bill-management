import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const { userId } = params;
  try {
    const query = `*[_type == "bill" && customer._ref == $userId] {
      _id,
      createdAt,
      totalAmount,
      paidAmount,
      balanceAmount,
      paymentStatus
    }`;
    const bills: Array<{ _id: string; createdAt: string; totalAmount?: number; paidAmount?: number; balanceAmount?: number; paymentStatus?: string; }> = await sanityClient.fetch(query, { userId });

    const totalBills = bills.length;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let latestBillDate: string | null = null;

    for (const b of bills) {
      totalPaid += Number(b.paidAmount || 0);
      const outstanding = Number(b.balanceAmount != null ? b.balanceAmount : (Number(b.totalAmount || 0) - Number(b.paidAmount || 0)));
      totalOutstanding += Math.max(0, outstanding);
      const d = new Date(b.createdAt).getTime();
      if (!latestBillDate || d > new Date(latestBillDate).getTime()) latestBillDate = b.createdAt;
    }

    const data = { totalBills, totalPaid, totalOutstanding, latestBillDate };
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("/api/bill-book/user/[userId]/summary failed:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch summary" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
