import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ billId: string }> },
) {
  const { billId } = await params;
  try {
    const messages = await sanityClient.fetch(
      `*[_type == "billMessage" && bill._ref == $billId] | order(createdAt asc) {
        _id,
        bill,
        sender,
        recipient,
        content,
        attachments,
        status,
        deliveredAt,
        seenAt,
        editedAt,
        parentId,
        createdAt,
        updatedAt,
        isEncrypted
      }`,
      { billId },
    );

    return NextResponse.json({ success: true, data: messages || [] });
  } catch (error) {
    console.error("/api/bill-book/bill/[billId]/messages GET failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ billId: string }> },
) {
  const { billId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const { content, senderId, recipientId, parentId } = body || {};

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing content" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const doc = await sanityClient.create({
      _type: "billMessage",
      bill: { _type: "reference", _ref: String(billId) },
      sender: senderId
        ? { _type: "reference", _ref: String(senderId) }
        : undefined,
      recipient: recipientId
        ? { _type: "reference", _ref: String(recipientId) }
        : undefined,
      content: String(content),
      attachments: [],
      status: "sent",
      deliveredAt: null,
      seenAt: null,
      editedAt: null,
      parentId: parentId ? String(parentId) : null,
      isEncrypted: false,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error("/api/bill-book/bill/[billId]/messages POST failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
