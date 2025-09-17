import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

// PATCH: update a message
// This endpoint handles both content updates and status updates
export async function PATCH(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  const { messageId } = params;
  
  try {
    const body = await req.json().catch(() => ({}));
    const { content, status } = body;

    if (!content && !status) {
      return NextResponse.json(
        { success: false, error: "Missing content or status" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const updateData: any = { updatedAt: now };
    
    if (content) {
      updateData.content = content;
      updateData.editedAt = now;
    }
    
    if (status) {
      updateData.status = status;
      if (status === 'delivered') {
        updateData.deliveredAt = now;
      } else if (status === 'seen') {
        updateData.seenAt = now;
      }
    }

    // Update the message in Sanity
    const updatedMessage = await sanityClient
      .patch(messageId)
      .set(updateData)
      .commit();

    return NextResponse.json({ success: true, data: updatedMessage });
  } catch (error) {
    console.error("Failed to update message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update message" },
      { status: 500 }
    );
  }
}

// GET: get a single message (not currently used but might be useful)
export async function GET(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  const { messageId } = params;
  
  try {
    const message = await sanityClient.fetch(
      `*[_type == "chatMessage" && _id == $messageId][0]`,
      { messageId }
    );

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("Failed to fetch message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch message" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
