import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

type Reaction = {
  userId: string;
  userName?: string;
  emoji: string;
  timestamp?: string;
};

export async function POST(
  req: Request,
  { params }: { params: { messageId: string } },
) {
  const { messageId } = params;

  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    const userName = String(body?.userName || "").trim();
    const emoji = String(body?.emoji || "").trim();

    if (!messageId || !userId || !emoji) {
      return NextResponse.json(
        { success: false, error: "Missing messageId/userId/emoji" },
        { status: 400 },
      );
    }

    const msg = await sanityClient.fetch(
      `*[_type == "chatMessage" && _id == $messageId][0]{ _id, reactions, room, sender, content, attachments, status, deliveredAt, seenAt, editedAt, parentId, parentMessage, createdAt, updatedAt }`,
      { messageId },
    );

    if (!msg?._id) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 },
      );
    }

    const existing: Reaction[] = Array.isArray(msg.reactions)
      ? msg.reactions
      : [];
    const idx = existing.findIndex((r) => String(r.userId) === userId);
    const next = [...existing];
    const now = new Date().toISOString();

    if (idx >= 0) {
      if (next[idx].emoji === emoji) {
        next.splice(idx, 1);
      } else {
        next[idx] = { ...next[idx], emoji, timestamp: now };
      }
    } else {
      next.push({ userId, userName: userName || undefined, emoji, timestamp: now });
    }

    await sanityClient.patch(messageId).set({ reactions: next, updatedAt: now }).commit();

    const updated = await sanityClient.fetch(
      `*[_type == "chatMessage" && _id == $messageId][0]{
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
        parentMessage,
        reactions,
        createdAt,
        updatedAt
      }`,
      { messageId },
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to react message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to react message" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
