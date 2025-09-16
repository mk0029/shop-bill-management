import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

// GET: list messages for a bill (compat layer) -> reads from the customer's chat room
export async function GET(_req: Request, { params }: { params: { billId: string } }) {
  const { billId } = params;
  try {
    // Resolve bill -> customer -> room
    const bill = await sanityClient.fetch(
      `*[_type == "bill" && _id == $billId][0]{ _id, customer->{ _id, name } }`,
      { billId }
    );
    if (!bill?.customer?._id) {
      return NextResponse.json({ success: true, data: [] });
    }

    const room = await sanityClient.fetch(
      `*[_type == "chatRoom" && customer._ref == $customerId][0]{ _id }`,
      { customerId: bill.customer._id }
    );

    if (!room?._id) {
      return NextResponse.json({ success: true, data: [] });
    }

    const msgs = await sanityClient.fetch(
      `*[_type == "chatMessage" && room._ref == $roomId] | order(createdAt asc) {
        _id,
        room,
        sender,
        content,
        attachments,
        status,
        deliveredAt,
        seenAt,
        editedAt,
        parentId,
        createdAt,
        updatedAt
      }`,
      { roomId: room._id }
    );
    return NextResponse.json({ success: true, data: msgs });
  } catch (error) {
    console.error("/api/bill-book/bill/[billId]/messages GET failed:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST: create a new message for a bill (compat layer) -> writes to chat room
export async function POST(req: Request, { params }: { params: { billId: string } }) {
  const { billId } = params;
  try {
    const body = await req.json().catch(() => ({}));
    const { content, recipientId, senderId, parentId } = body || {};
    if (!content) {
      return NextResponse.json({ success: false, error: "Missing content" }, { status: 400 });
    }

    // Resolve bill -> customer
    const bill = await sanityClient.fetch(
      `*[_type == "bill" && _id == $billId][0]{ _id, customer->{ _id, name } }`,
      { billId }
    );
    const customerId: string | undefined = bill?.customer?._id;
    if (!customerId) {
      return NextResponse.json({ success: false, error: "Bill has no customer" }, { status: 400 });
    }

    // Find or create room for this customer
    let room = await sanityClient.fetch(
      `*[_type == "chatRoom" && customer._ref == $customerId][0]{ _id, roomName, participants[]{ role, user->{_id}, blocked, notify, isActive } }`,
      { customerId }
    );
    if (!room?._id) {
      // Get all admins
      const adminIds: string[] = await sanityClient.fetch(`*[_type == "user" && role in ["admin", "super_admin"]]._id`);
      const now = new Date().toISOString();
      const created = await sanityClient.create({
        _type: "chatRoom",
        roomName: `admin-(${bill?.customer?.name || 'customer'})`,
        customer: { _type: 'reference', _ref: customerId },
        admins: adminIds.map((_id) => ({ _type: 'reference', _ref: _id })),
        participants: [
          { _type: 'object', role: 'customer', user: { _type: 'reference', _ref: customerId }, muted: false, blocked: false, notify: true, isActive: true },
          ...adminIds.map((_id) => ({ _type: 'object', role: 'admin', user: { _type: 'reference', _ref: _id }, muted: false, blocked: false, notify: true, isActive: true }))
        ],
        lastMessage: '',
        lastMessageAt: now,
        unreadForCustomer: 0,
        unreadForAdmins: 0,
        createdAt: now,
        updatedAt: now,
      });
      room = await sanityClient.fetch(`*[_type == "chatRoom" && _id == $id][0]`, { id: (created as { _id: string })._id });
    }

    // Ensure sender is participant; infer isCustomer if not provided
    const isCustomer = Boolean(senderId && String(senderId) === String(customerId));

    const now = new Date().toISOString();
    const chatDoc = await sanityClient.create({
      _type: "chatMessage",
      room: { _type: "reference", _ref: String(room._id) },
      sender: senderId ? { _type: "reference", _ref: String(senderId) } : { _type: 'reference', _ref: String(customerId) },
      content,
      attachments: [],
      status: "sent",
      parentId: parentId ? String(parentId) : undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Update room counters/preview
    try {
      const patch = sanityClient.patch(String(room._id)).set({ lastMessage: content.slice(0, 120), lastMessageAt: now, updatedAt: now });
      if (isCustomer) patch.inc({ unreadForAdmins: 1 }); else patch.inc({ unreadForCustomer: 1 });
      await patch.commit();
    } catch {}

    // Targeted notification: if sender is customer, notify admins; else notify customer
    try {
      const oppositeIds: string[] = [];
      const participants = (room as any)?.participants || [];
      const targetRole = isCustomer ? 'admin' : 'customer';
      participants.forEach((p: any) => {
        if (p?.user?._id && p?.role === targetRole && !p?.blocked && p?.notify !== false) {
          oppositeIds.push(String(p.user._id));
        }
      });
      const title = 'New chat message';
      const bodyText = content?.slice(0, 120) || 'You have a new message';
      if (oppositeIds.length > 0) {
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/notifications/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            body: bodyText,
            userIds: oppositeIds,
            data: { event: 'chat-message', roomId: String((room as any)._id), messageId: String(((chatDoc as { _id?: string })?._id) ?? '') },
            sound: 'default',
          }),
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({ success: true, data: chatDoc, roomId: String((room as any)._id) });
  } catch (error) {
    console.error("/api/bill-book/bill/[billId]/messages POST failed:", error);
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

