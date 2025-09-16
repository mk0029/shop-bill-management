import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

// GET all messages across all bills for a given user (customer _id)
export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const { userId } = params;
  try {
    // Find all bill ids for this user
    const billIdsQuery = `*[_type == "bill" && customer._ref == $userId]._id`;
    const billIds: string[] = await sanityClient.fetch(billIdsQuery, { userId });

    if (!billIds || billIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch all messages for these bills
    const messagesQuery = `*[_type == "billMessage" && bill._ref in $billIds] | order(createdAt asc) {
      _id,
      bill,
      sender,
      recipient,
      content,
      attachments,
      status,
      createdAt,
      updatedAt,
      isEncrypted
    }`;

    const data = await sanityClient.fetch(messagesQuery, { billIds });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("/api/bill-book/user/[userId]/messages GET failed:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch messages" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
