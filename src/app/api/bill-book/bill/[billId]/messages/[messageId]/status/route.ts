import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getSanityClient } from "@/lib/sanity/client-factory";
import { updateDocument } from "@/lib/sanity/write-router";

// PATCH: update message delivery/read status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ billId: string; messageId: string }> },
) {
  const { billId, messageId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const { status } = body as { status?: "delivered" | "seen" };
    if (status !== "delivered" && status !== "seen") {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    // Ensure message belongs to bill (best-effort check)
    const query = `*[_type == "billMessage" && _id == $id && bill._ref == $billId][0]{ _id, status, deliveredAt }`;
    const check =
      (await getSanityClient("comms")
        .fetch(query, { id: messageId, billId })
        .catch(() => null)) ||
      (await sanityClient
        .fetch(query, { id: messageId, billId })
        .catch(() => null));
    if (!check) {
      return NextResponse.json({ success: false, error: "Message not found for bill" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const sets: Record<string, any> = { updatedAt: now };
    if (status === "delivered") {
      sets.status = "delivered";
      sets.deliveredAt = now;
    } else if (status === "seen") {
      sets.status = "seen";
      sets.seenAt = now;
      if (!check?.deliveredAt) sets.deliveredAt = now; // backfill if missing
    }

    const patched = await updateDocument(messageId, sets, "bill-messages");
    if (!patched.success) {
      // Legacy primary fallback for old messages
      const legacy = await sanityClient.patch(messageId).set(sets).commit().catch(() => null);
      if (!legacy) {
        throw new Error(patched.error || "Failed to update status");
      }
    }
    return NextResponse.json({ success: true, data: { _id: messageId, ...sets } });
  } catch (error) {
    console.error(`/api/bill-book/bill/${billId}/messages/${messageId}/status PATCH failed:`, error);
    return NextResponse.json({ success: false, error: "Failed to update status" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
