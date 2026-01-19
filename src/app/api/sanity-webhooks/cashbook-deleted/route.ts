import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

function getEnv(name: string, fallback = "") {
  try {
    return process.env[name] ?? fallback;
  } catch {
    return fallback;
  }
}

export async function POST(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret") || request.headers.get("x-webhook-secret") || "";
    const expected = getEnv("SANITY_WEBHOOK_SECRET", getEnv("NEXT_PUBLIC_SANITY_WEBHOOK_SECRET", ""));
    if (!expected || secret !== expected) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({} as any));
    // Try best-effort extraction of deleted cash book entry id from webhook
    const deletedId: string | undefined = (
      payload?.documentId ||
      payload?._id ||
      (Array.isArray(payload?.ids) ? payload.ids[0] : undefined) ||
      payload?.event?.documentId ||
      payload?.body?.documentId
    );

    // Optionally check type/operation if present
    const docType = payload?._type || payload?.documentType || payload?.event?.documentType;
    const op = payload?.operation || payload?.event?.operation;
    if (!deletedId) {
      return NextResponse.json({ success: false, error: "Missing document id" }, { status: 400 });
    }
    if (docType && String(docType) !== "cashBookEntry") {
      // Ignore other types
      return NextResponse.json({ success: true, ignored: true });
    }
    if (op && String(op).toLowerCase() !== "delete") {
      // Only act on deletions
      return NextResponse.json({ success: true, ignored: true });
    }

    // Find stock transactions referencing the deleted cash book entry
    const query = `*[_type == "stockTransaction" && defined(cashBookEntry) && cashBookEntry._ref == $id][]._id`;
    const stockTxIds: string[] = await sanityClient.fetch(query, { id: deletedId });

    if (!Array.isArray(stockTxIds) || stockTxIds.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const tx = sanityClient.transaction();
    for (const id of stockTxIds) {
      tx.delete(id);
    }
    await tx.commit();

    return NextResponse.json({ success: true, deleted: stockTxIds.length, ids: stockTxIds });
  } catch (err: any) {
    console.error("Webhook cashbook-deleted handler failed", err);
    return NextResponse.json({ success: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
