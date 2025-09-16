import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

// PATCH: update a message content
export async function PATCH(req: Request, { params }: { params: { billId: string; messageId: string } }) {
  const { billId, messageId } = params;
  try {
    const body = await req.json().catch(() => ({}));
    const { content } = body || {};
    if (!content || typeof content !== "string") {
      return NextResponse.json({ success: false, error: "Missing content" }, { status: 400 });
    }

    // Ensure message belongs to bill (best-effort check)
    const check = await sanityClient.fetch(
      `*[_type == "billMessage" && _id == $id && bill._ref == $billId][0]{ _id }`,
      { id: messageId, billId }
    );
    if (!check) {
      return NextResponse.json({ success: false, error: "Message not found for bill" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const patched = await sanityClient
      .patch(messageId)
      .set({ content, updatedAt: now, editedAt: now })
      .commit();
    return NextResponse.json({ success: true, data: patched });
  } catch (error) {
    console.error(`/api/bill-book/bill/${billId}/messages/${params.messageId} PATCH failed:`, error);
    return NextResponse.json({ success: false, error: "Failed to update message" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

