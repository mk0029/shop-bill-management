import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { sendNotificationEvent } from "@/services/notifications/notification-events.server";

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

    if (recipientId && String(recipientId) !== String(senderId || "")) {
      const [recipient, sender, bill] = await Promise.all([
        sanityClient.fetch<{ _id?: string; role?: string; name?: string } | null>(
          `*[_type=="user" && _id==$id][0]{_id, role, name}`,
          { id: String(recipientId) },
        ),
        senderId
          ? sanityClient.fetch<{ _id?: string; role?: string; name?: string } | null>(
              `*[_type=="user" && _id==$id][0]{_id, role, name}`,
              { id: String(senderId) },
            )
          : Promise.resolve(null),
        sanityClient.fetch<{ billNumber?: string; customer?: { _id?: string; name?: string } } | null>(
          `*[_type=="bill" && _id==$id][0]{billNumber, customer->{_id, name}}`,
          { id: String(billId) },
        ),
      ]);
      const recipientRole = String(recipient?.role || "");
      const senderName = String(sender?.name || "Someone");
      const isRecipientCustomer = recipientRole === "customer";
      const targetRoute = isRecipientCustomer
        ? `/customer/bills?open=${encodeURIComponent(String(billId))}`
        : `/admin/billing?open=${encodeURIComponent(String(billId))}`;

      sendNotificationEvent({
        eventId: `bill.message.created.${String((doc as { _id?: string })?._id || Date.now())}`,
        type: "bill.message.created",
        actorUserId: senderId ? String(senderId) : undefined,
        userId: String(recipientId),
        title: isRecipientCustomer ? "New bill message" : `Message from ${bill?.customer?.name || senderName}`,
        body: String(content).slice(0, 120),
        data: {
          userId: String(recipientId),
          billId: String(billId),
          billNumber: bill?.billNumber || "",
          customerId: bill?.customer?._id || "",
          messageId: String((doc as { _id?: string })?._id || ""),
          senderId: senderId ? String(senderId) : "",
          senderName,
          route: targetRoute,
          route_path: targetRoute,
        },
        skipActor: true,
      }).catch((error) => console.error("[Notify] bill.message.created failed", error));
    }

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
