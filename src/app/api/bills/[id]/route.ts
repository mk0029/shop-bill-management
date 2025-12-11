/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.NEXT_PUBLIC_SANITY_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Server is missing SANITY_API_TOKEN (write token)" },
        { status: 500 }
      );
    }

    // Derive bill id from params or fallback to URL path as a safety net (handles trailing slashes)
    const fromParams = (params as any)?.id as string | undefined;
    const fromUrl = (() => {
      try {
        const u = new URL(req.url);
        const parts = u.pathname.split('/').filter(Boolean); // remove empty segments
        // Find the segment after 'bills'
        const billsIndex = parts.lastIndexOf('bills');
        if (billsIndex >= 0 && parts[billsIndex + 1]) return parts[billsIndex + 1];
        // Otherwise, use the last non-empty segment as a fallback
        return parts[parts.length - 1] || undefined;
      } catch {
        return undefined;
      }
    })();
    const id = String(fromParams || fromUrl || '').trim();
    // Debug: log id derivation
    try {
      console.log("[API] PATCH /api/bills - id derivation", {
        url: req.url,
        fromParams,
        fromUrl,
        id,
      });
    } catch {}
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing bill id" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const allowedKeys = new Set([
      "paymentStatus",
      "paidAmount",
      "balanceAmount",
      "status",
      "notes",
      "internalNotes",
      "discount",
    ]);
    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (allowedKeys.has(k)) updates[k] = v;
    }
    // Always set updatedAt
    updates["updatedAt"] = new Date().toISOString();

    // Patch published doc
    const updated = await sanityClient.patch(id).set(updates).commit();
    // Best-effort: also patch draft if it exists
    try {
      await sanityClient.patch(`drafts.${id}`).set(updates).commit();
    } catch {}
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("API: Failed to patch bill", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update bill" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing bill id" },
        { status: 400 }
      );
    }

    await sanityClient.delete(id);
    return NextResponse.json({ success: true, message: "Bill deleted" });
  } catch (error: any) {
    console.error("API: Failed to delete bill", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete bill" },
      { status: 500 }
    );
  }
}
