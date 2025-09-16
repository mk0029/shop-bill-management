import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

// GET: list messages for a chat room
export async function GET(req: Request, { params }: { params: { roomId: string } }) {
  const { roomId } = params;
  try {
    const { searchParams } = new URL(req.url);
    const pageSize = Number(searchParams.get("limit") ?? 50);

    // Basic pagination by createdAt using GROQ slices can be done, but we'll keep it simple
    const query = `*[_type == "chatMessage" && room._ref == $roomId] | order(createdAt asc) {
      _id,
      room,
      sender->{ _id, name },
      content,
      attachments,
      status,
      deliveredAt,
      seenAt,
      editedAt,
      parentId,
      createdAt,
      updatedAt
    }`;

    const data = await sanityClient.fetch(query, { roomId });
    // TODO: implement cursor-based pagination if needed
    const sliced = data.slice(-(pageSize || 50));
    return NextResponse.json({ success: true, data: sliced });
  } catch (error) {
    console.error("/api/chat/room/[roomId]/messages GET failed:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST: create a new message in a chat room
export async function POST(req: Request, { params }: { params: { roomId: string } }) {
  const { roomId } = params;
  try {
    const body = await req.json().catch(() => ({}));
    const { content, senderId, isCustomer } = body || {};
    if (!content || !senderId) {
      return NextResponse.json({ success: false, error: "Missing content or senderId" }, { status: 400 });
    }

    // Validate room exists and fetch participants
    const room = await sanityClient.fetch(
      `*[_type == "chatRoom" && _id == $roomId][0]{
        _id, roomName,
        customer->{_id, name},
        admins[]->{_id, name},
        participants[]{ role, muted, blocked, notify, isActive, user->{ _id, name } }
      }`,
      { roomId }
    );
    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    // Security: sender must be an active participant and not blocked
    const participants: Array<{ role: 'admin' | 'customer'; muted?: boolean; blocked?: boolean; notify?: boolean; isActive?: boolean; user?: { _id: string } }> = room.participants || [];
    const senderParticipant = participants.find((p) => p.user?._id === String(senderId));
    if (!senderParticipant || senderParticipant.blocked || senderParticipant.isActive === false) {
      return NextResponse.json({ success: false, error: "Sender is not allowed in this room" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const doc = await sanityClient.create({
      _type: "chatMessage",
      room: { _type: "reference", _ref: roomId },
      sender: { _type: "reference", _ref: String(senderId) },
      content,
      attachments: [],
      status: "sent",
      createdAt: now,
      updatedAt: now,
    });

    // Update room metadata: lastMessage, lastMessageAt, unread counters
    try {
      const patch = sanityClient.patch(roomId).set({
        lastMessage: content.slice(0, 120),
        lastMessageAt: now,
        updatedAt: now,
      });

      // Increment unread for the opposite side
      if (isCustomer) {
        patch.inc({ unreadForAdmins: 1 });
      } else {
        patch.inc({ unreadForCustomer: 1 });
      }

      await patch.commit();
    } catch {}

    // Fire-and-forget push notification
    try {
      const title = room.roomName || `New chat message`;
      const bodyText = content?.slice(0, 120) || "You have a new message";
      // Target notify-enabled, not-blocked recipients of opposite role
      const targets: string[] = [];
      const oppositeRole: 'admin' | 'customer' = isCustomer ? 'admin' : 'customer';
      for (const p of participants) {
        if (p.user?._id && p.role === oppositeRole && !p.blocked && p.notify !== false) {
          targets.push(String(p.user._id));
        }
      }
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body: bodyText,
          userIds: targets,
          data: { event: 'chat-message', roomId: String(roomId), messageId: String(((doc as { _id?: string })?._id) ?? '') },
          sound: 'default',
        }),
      }).catch(() => {});
    } catch {}

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error("/api/chat/room/[roomId]/messages POST failed:", error);
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
