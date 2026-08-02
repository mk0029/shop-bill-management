/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";

async function resolveCashbookEntryDocumentId(identifier: string): Promise<string | null> {
  const key = String(identifier || "").trim();
  if (!key) return null;

  // First try as document _id
  const byId = await sanityClient.fetch(
    `*[_type == "cashBookEntry" && _id == $key][0]{ _id }`,
    { key }
  );
  if (byId?._id) return String(byId._id);

  return null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    // Derive entry id from params or fallback to URL path as a safety net (handles trailing slashes)
    const fromParams = (params as any)?.id as string | undefined;
    const fromUrl = (() => {
      try {
        const u = new URL(_req.url);
        const parts = u.pathname.split('/').filter(Boolean); // remove empty segments
        // Find the segment after 'cashbook'
        const cashbookIndex = parts.lastIndexOf('cashbook');
        if (cashbookIndex >= 0 && parts[cashbookIndex + 1]) return parts[cashbookIndex + 1];
        // Otherwise, use the last non-empty segment as a fallback
        return parts[parts.length - 1] || undefined;
      } catch {
        return undefined;
      }
    })();
    const raw = String(fromParams || fromUrl || '').trim();
    
    if (!raw) {
      return NextResponse.json({ success: false, error: "Missing cashbook entry id" }, { status: 400 });
    }
    
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden - requires super_admin role" }, { status: 403 });
    }

    const id = await resolveCashbookEntryDocumentId(raw);
    if (!id) {
      return NextResponse.json({ success: false, error: "Cashbook entry not found" }, { status: 404 });
    }

    const entry = await sanityClient.fetch(
      `*[_type == "cashBookEntry" && _id == $id][0]{
        _id,
        amount,
        type,
        description,
        date,
        paymentMethod,
        reference,
        notes,
        createdAt,
        updatedAt,
        user->{_id, name},
        bill->{_id, billNumber}
      }`,
      { id }
    );

    if (!entry) {
      return NextResponse.json({ success: false, error: "Cashbook entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: entry }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    // Derive entry id from params or fallback to URL path as a safety net (handles trailing slashes)
    const fromParams = (params as any)?.id as string | undefined;
    const fromUrl = (() => {
      try {
        const u = new URL(req.url);
        const parts = u.pathname.split('/').filter(Boolean); // remove empty segments
        // Find the segment after 'cashbook'
        const cashbookIndex = parts.lastIndexOf('cashbook');
        if (cashbookIndex >= 0 && parts[cashbookIndex + 1]) return parts[cashbookIndex + 1];
        // Otherwise, use the last non-empty segment as a fallback
        return parts[parts.length - 1] || undefined;
      } catch {
        return undefined;
      }
    })();
    const raw = String(fromParams || fromUrl || '').trim();
    
    if (!raw) {
      return NextResponse.json({ success: false, error: "Missing cashbook entry id" }, { status: 400 });
    }
    
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden - requires super_admin role" }, { status: 403 });
    }

    const id = await resolveCashbookEntryDocumentId(raw);
    if (!id) {
      return NextResponse.json({ success: false, error: "Cashbook entry not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    const patch: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (body?.createdAt) {
      patch.createdAt = String(body.createdAt);
    }
    if (body?.amount !== undefined) {
      patch.amount = Number(body.amount);
    }
    if (body?.type) {
      patch.type = String(body.type);
    }
    if (body?.description !== undefined) {
      patch.description = String(body.description);
    }
    if (body?.date) {
      patch.date = String(body.date).slice(0, 10);
    }
    if (body?.paymentMethod) {
      patch.paymentMethod = String(body.paymentMethod);
    }
    if (body?.reference !== undefined) {
      patch.reference = String(body.reference);
    }
    if (body?.notes !== undefined) {
      patch.notes = String(body.notes);
    }

    const updated = await sanityClient.patch(id).set(patch).commit();

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    // Derive entry id from params or fallback to URL path as a safety net (handles trailing slashes)
    const fromParams = (params as any)?.id as string | undefined;
    const fromUrl = (() => {
      try {
        const u = new URL(_req.url);
        const parts = u.pathname.split('/').filter(Boolean); // remove empty segments
        // Find the segment after 'cashbook'
        const cashbookIndex = parts.lastIndexOf('cashbook');
        if (cashbookIndex >= 0 && parts[cashbookIndex + 1]) return parts[cashbookIndex + 1];
        // Otherwise, use the last non-empty segment as a fallback
        return parts[parts.length - 1] || undefined;
      } catch {
        return undefined;
      }
    })();
    const raw = String(fromParams || fromUrl || '').trim();
    
    if (!raw) {
      return NextResponse.json({ success: false, error: "Missing cashbook entry id" }, { status: 400 });
    }
    
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden - requires super_admin role" }, { status: 403 });
    }

    const id = await resolveCashbookEntryDocumentId(raw);
    if (!id) {
      return NextResponse.json({ success: false, error: "Cashbook entry not found" }, { status: 404 });
    }

    // Get entry details before deletion for reference handling
    const entry = await sanityClient.fetch(
      `*[_type == "cashBookEntry" && _id == $id][0]{
        _id,
        amount,
        type,
        bill->{_id, billNumber},
        items[]{
          quantity,
          product->{_id}
        }
      }`,
      { id }
    );

    if (!entry) {
      return NextResponse.json({ success: false, error: "Cashbook entry not found" }, { status: 404 });
    }

    // Handle inventory restoration if this was a bill payment entry
    if (entry.type === "debit" && entry.bill && entry.items) {
      try {
        // Restore inventory items for bill payments
        const itemsForRestore = Array.isArray(entry.items)
          ? entry.items
              .filter((it: any) => it?.product?._id && Number(it?.quantity || 0) > 0)
              .map((it: any) => ({
                productId: String(it.product._id),
                quantity: Number(it.quantity || 0),
              }))
          : [];

        if (itemsForRestore.length) {
          // Import and use updateStockForBill
          const { updateStockForBill } = await import("@/lib/inventory-management");
          await updateStockForBill(itemsForRestore, id, "restore");
        }
      } catch (invErr) {
        console.warn("[API] DELETE cashbook: inventory restore failed", invErr);
        // Continue with deletion even if inventory restore fails
      }
    }

    // Delete the cashbook entry
    await sanityClient.delete(id);
    
    return NextResponse.json({ success: true, message: "Cashbook entry deleted" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
