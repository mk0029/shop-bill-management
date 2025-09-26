import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { sendNotification, sendToAdmins } from "@/lib/notification-service";

// GET: list messages for a chat room
export async function GET(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  try {
    if (!roomId) {
      return NextResponse.json({ success: false, error: "Missing roomId in route params" }, { status: 400 });
    }
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
export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  try {
    if (!roomId) {
      return NextResponse.json({ success: false, error: "Missing roomId in route params" }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const { content, senderId, isCustomer, parentId, parentMessage, senderToken, attachments } = body || {};
    if (!senderId || (!content && (!attachments || attachments.length === 0))) {
      return NextResponse.json({ success: false, error: "Missing content or senderId" }, { status: 400 });
    }

    // Define attachment type
    interface ChatAttachment {
      _id?: string;
      filename: string;
      size: number;
      type: string;
      url: string;
    }

    // Process attachments - convert URLs to simple array format
    let processedAttachments: ChatAttachment[] = [];
    if (attachments && Array.isArray(attachments)) {
      processedAttachments = attachments as ChatAttachment[];
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
      ...(processedAttachments.length > 0 ? { attachments: processedAttachments } : {}),
      status: "sent",
      parentId: parentId ? String(parentId) : undefined,
      parentMessage: parentMessage ? {
        _id: parentMessage._id,
        content: parentMessage.content,
        sender: parentMessage.sender ? { _type: "reference", _ref: String(parentMessage.sender._id || parentMessage.sender._ref) } : undefined
      } : undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Also update the parent message to include the reply reference
    if (parentId) {
      try {
        await sanityClient
          .patch(parentId)
          .setIfMissing({ replies: [] })
          .append('replies', [{
            _key: `reply-${Date.now()}`,
            _type: 'reference',
            _ref: doc._id
          }])
          .commit();
      } catch (error) {
        console.error('Failed to update parent message with reply reference:', error);
      }
    }

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

    // Fire-and-forget push notification (internal call, no HTTP fetch needed)
    try {
      // Use sender's name instead of room name for notification title
      const senderName = (() => {
        try {
          const p = (participants || []).find((x) => x.user?._id === String(senderId));
          return (p?.user as { name?: string } | undefined)?.name?.trim();
        } catch {
          return undefined;
        }
      })() || "Someone";

      // If this is a reply, modify the notification text
      const isReply = !!parentId;
      const title = isReply ? `${senderName} replied:` : `${senderName}:`;
      const bodyText = isReply 
        ? `Replied: ${content?.slice(0, 100) || "You have a new reply"}`
        : content?.slice(0, 120) || "You have a new message";
      const route_path_for_admin = '/admin/chats';
      const route_path_for_customer = '/customer/chat';
      const route_query = JSON.stringify({ roomId: String(roomId) });

      if (isCustomer) {
        // Customer sent: notify all admins
        const result = await sendToAdmins(title, bodyText, {
          type: 'chat',
          event: 'chat-message',
          tag: `chat-room-${String(roomId)}`,
          roomId: String(roomId),
          messageId: String(((doc as { _id?: string })?._id) ?? ''),
          route_path: route_path_for_admin,
          route_query,
        }, [String(senderId)], senderToken ? [String(senderToken)] : undefined);
        if (!result?.success) {
          console.error('[FCM] sendToAdmins failed', result?.errors);
        }
      } else {
        // Admin sent: notify the room's customer (fallback to participants with role customer)
        const customerId: string | undefined = room?.customer?._id || undefined;
        const userIds: string[] = [];
        if (customerId) userIds.push(String(customerId));
        if (!userIds.length) {
          for (const p of (participants || [])) {
            if (p.user?._id && p.role === 'customer' && !p.blocked && p.notify !== false) {
              userIds.push(String(p.user._id));
            }
          }
        }
        if (userIds.length) {
          const res = await sendNotification({
            title,
            body: bodyText,
            userIds,
            data: {
              type: 'chat',
              event: 'chat-message',
              tag: `chat-room-${String(roomId)}`,
              roomId: String(roomId),
              messageId: String(((doc as { _id?: string })?._id) ?? ''),
              route_path: route_path_for_customer,
              route_query,
            },
            sound: 'default',
            // Also exclude the sender's device token if provided (belt-and-suspenders)
            excludeTokens: senderToken ? [String(senderToken)] : undefined,
          });
          if (!res?.success) {
            console.error('[FCM] sendNotification to customer failed', res?.errors);
          }
        } else {
          console.warn('[FCM] No customer userIds found for room', roomId);
        }
      }
    } catch (err) {
      console.error('[FCM] Error sending chat push', err);
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error("/api/chat/room/[roomId]/messages POST failed:", error);
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
