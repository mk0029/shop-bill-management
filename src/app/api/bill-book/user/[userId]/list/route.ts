import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  try {
    const query = `*[_type == "bill" && customer._ref == $userId || customer == $userId] {
      _id,
      billId,
      billNumber,
      billDate,
      serviceDate,
      createdAt,
      status,
      paymentStatus,
      serviceType,
      locationType,
      subtotal,
      totalAmount,
      paidAmount,
      balanceAmount,
      customer->{ _id, name }
    } | order(createdAt desc)`;

    const raw = await sanityClient.fetch(query, { userId });
    // Compute a normalized paymentStatus when missing
    type BillRow = {
      _id: string;
      billId?: string;
      billNumber?: string;
      billDate?: string;
      serviceDate?: string;
      createdAt?: string;
      status?: string;
      paymentStatus?: string;
      serviceType?: string;
      locationType?: string;
      subtotal?: number | string;
      totalAmount?: number | string;
      paidAmount?: number | string;
      balanceAmount?: number | string;
      customer?: { _id?: string; name?: string };
      [k: string]: unknown;
    };
    const data = (Array.isArray(raw) ? (raw as BillRow[]) : []).map((b) => {
      const total = Number(b.totalAmount ?? 0);
      const paid = Number(b.paidAmount ?? 0);
      // Always derive the canonical status from amounts
      const derived = total > 0
        ? (paid >= total ? 'paid' : (paid > 0 ? 'partial' : 'pending'))
        : ((paid > 0) ? 'partial' : 'pending');
      // If stored paymentStatus conflicts, prefer derived to avoid stale states
      const ps: string = derived;
      return { ...b, paymentStatus: ps } as BillRow;
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("/api/bill-book/user/[userId]/list failed:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch bill list" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
