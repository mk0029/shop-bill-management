import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const { userId } = params;
  try {
    const query = `*[_type == "bill" && customer._ref == $userId] {
      _id,
      billId,
      billNumber,
      createdAt,
      status,
      serviceType,
      locationType,
      subtotal,
      totalAmount,
      paidAmount,
      balanceAmount,
      customer->{ _id, name }
    } | order(createdAt desc)`;

    const data = await sanityClient.fetch(query, { userId });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("/api/bill-book/user/[userId]/list failed:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch bill list" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
