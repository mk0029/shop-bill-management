import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";

export async function GET(req: Request) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

    let query: string;
    let params: Record<string, unknown> = { limit };

    if (customerId) {
      query = `*[_type == "advanceTransaction" && customer._ref == $customerId] | order(createdAt desc) [0...$limit] {
        _id, amount, type, reason, reference, createdAt,
        customer->{_id, name, phone},
        bill->{_id, billNumber}
      }`;
      params.customerId = customerId;
    } else {
      query = `*[_type == "advanceTransaction"] | order(createdAt desc) [0...$limit] {
        _id, amount, type, reason, reference, createdAt,
        customer->{_id, name, phone},
        bill->{_id, billNumber}
      }`;
    }

    const transactions = await sanityClient.fetch(query, params);
    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    console.error("[AdvanceTransactions] Failed to fetch:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch advance transactions" },
      { status: 500 }
    );
  }
}
