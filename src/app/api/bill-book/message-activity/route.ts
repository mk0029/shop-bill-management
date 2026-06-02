import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

// Returns latest bill-message timestamp per customer to support recent activity sorting.
export async function GET() {
  try {
    // For each customer, get the latest billMessage.createdAt where message.bill->customer._ref == customer._id.
    const query = `
      *[_type == "user" && (role == "customer" || defined(customerId))]{
        _id,
        name,
        "lastMessageAt": *[_type == "billMessage" && bill->customer._ref == ^._id] | order(createdAt desc)[0].createdAt
      }
    `;
    const data = await sanityClient.fetch(query);
    const mapped = (data || []).map((u: any) => ({ userId: u._id as string, lastMessageAt: u.lastMessageAt as string | null }));
    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    console.error("/api/bill-book/message-activity GET failed:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch message activity" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
