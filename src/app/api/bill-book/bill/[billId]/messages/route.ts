import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

// GET: list messages for a bill
export async function GET(_req: Request, { params }: { params: { billId: string } }) {
  const { billId } = params;
  try {
    const query = `*[_type == "billMessage" && bill._ref == $billId] | order(createdAt asc) {
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
    const data = await sanityClient.fetch(query, { billId });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("/api/bill-book/bill/[billId]/messages GET failed:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST: create a new message for a bill
export async function POST(req: Request, { params }: { params: { billId: string } }) {
  const { billId } = params;
  try {
    const body = await req.json().catch(() => ({}));
    const { content, recipientId, senderId, isEncrypted } = body || {};
    if (!content || !recipientId) {
      return NextResponse.json({ success: false, error: "Missing content or recipientId" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const doc = await sanityClient.create({
      _type: "billMessage",
      bill: { _type: "reference", _ref: billId },
      sender: senderId ? { _type: "reference", _ref: String(senderId) } : undefined,
      recipient: { _type: "reference", _ref: String(recipientId) },
      content,
      attachments: [],
      status: "sent",
      createdAt: now,
      updatedAt: now,
      isEncrypted: Boolean(isEncrypted) || false,
    });

    // Fire-and-forget push notification to recipient
    try {
      const title = 'New message on your bill';
      const bodyText = content?.slice(0, 120) || 'You have a new message';
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body: bodyText,
          userIds: [String(recipientId)],
          data: { event: 'bill-message', billId: String(billId), messageId: String((doc as any)?._id ?? '') },
          sound: 'default',
        }),
      }).catch(() => {});
    } catch {}

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error("/api/bill-book/bill/[billId]/messages POST failed:", error);
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
