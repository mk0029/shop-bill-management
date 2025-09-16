import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

// POST: mark a single message as seen
export async function POST(req: Request, { params }: { params: { messageId: string } }) {
  const { messageId } = params;
  try {
    // Ensure message exists and get its current status
    const msg = await sanityClient.fetch(
      `*[_type == "chatMessage" && _id == $id][0]{ _id, status, seenAt }`,
      { id: messageId }
    );
    if (!msg) {
      return NextResponse.json({ success: false, error: "Message not found" }, { status: 404 });
    }

    if (msg?.status === "seen" && msg?.seenAt) {
      return NextResponse.json({ success: true, data: msg });
    }

    const now = new Date().toISOString();
    const updated = await sanityClient
      .patch(messageId)
      .set({ status: "seen", seenAt: now, updatedAt: now })
      .commit();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("/api/chat/message/[messageId]/seen POST failed:", error);
    return NextResponse.json({ success: false, error: "Failed to mark message as seen" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
