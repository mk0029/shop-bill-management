/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";
import { emitWaEventServer } from "@/lib/wa-bot-server";
import { updateStockForBill } from "@/lib/inventory-management";
import { resolveBillEvents, emitBillEventsInBackground } from "@/lib/bill-events";

async function resolveBillDocumentId(identifier: string): Promise<string | null> {
  const key = String(identifier || "").trim();
  if (!key) return null;
  const publishedKey = key.startsWith("drafts.") ? key.replace(/^drafts\./, "") : key;
  const draftKey = publishedKey.startsWith("drafts.") ? publishedKey : `drafts.${publishedKey}`;

  // First try as document _id
  const byId = await sanityClient.fetch(
    `*[_type == "bill" && _id in [$key, $publishedKey, $draftKey]][0]{ _id }`,
    { key, publishedKey, draftKey }
  );
  if (byId?._id) return String(byId._id);

  // Then try billNumber or billId
  const byNumber = await sanityClient.fetch(
    `*[_type == "bill" && (billNumber == $key || billId == $key)][0]{ _id }`,
    { key }
  );
  if (byNumber?._id) return String(byNumber._id);

  return null;
}

async function getBillDependentDocumentIds(billId: string): Promise<string[]> {
  const publishedBillId = String(billId || "").replace(/^drafts\./, "");
  const draftBillId = publishedBillId.startsWith("drafts.") ? publishedBillId : `drafts.${publishedBillId}`;
  return await sanityClient.fetch(
    `*[
      _type in ["cashBookEntry","cashbookItem","billMessage","billItem"]
      && (
        bill._ref in [$billId, $publishedBillId, $draftBillId]
        || billId in [$billId, $publishedBillId, $draftBillId]
      )
    ]._id`,
    { billId, publishedBillId, draftBillId }
  );
}

async function getRemainingBillReferences(billId: string): Promise<Array<{ _id: string; _type: string }>> {
  return await sanityClient.fetch(
    `*[
      references($billId)
      && !(_type in ["bill","cashBookEntry","cashbookItem","billMessage","billItem"])
    ]{_id,_type}`,
    { billId }
  );
}

function toPhones(rawPhone?: string | null): string[] {
  const p = String(rawPhone || "").trim();
  if (!p) return [];
  if (p.startsWith("+")) return [p];
  if (p.startsWith("0")) return [`+91${p.substring(1)}`];
  return [`+91${p}`];
}

function calcTotals(input: {
  items: Array<{ quantity?: number; unitPrice?: number; totalPrice?: number }>;
  visitingCharges?: number;
  repairFee?: number;
  discount?: number;
}) {
  const subtotal = (input.items || []).reduce(
    (sum, it) => sum + Number(it.totalPrice ?? Number(it.quantity || 0) * Number(it.unitPrice || 0)),
    0
  );
  const visitingCharges = Number(input.visitingCharges || 0);
  const repairFee = Number(input.repairFee || 0);
  const discount = Number(input.discount || 0);
  const grossTotal = Math.max(0, subtotal + visitingCharges + repairFee);
  const netPayable = Math.max(0, grossTotal - discount);
  return { subtotal, grossTotal, netPayable, visitingCharges, repairFee, discount };
}


export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    // Derive bill id from params or fallback to URL path as a safety net (handles trailing slashes)
    const fromParams = (params as any)?.id as string | undefined;
    const fromUrl = (() => {
      try {
        const u = new URL(_req.url);
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
    const raw = String(fromParams || fromUrl || '').trim();
    
    if (!raw) {
      return NextResponse.json({ success: false, error: "Missing bill id" }, { status: 400 });
    }
    
    const auth = await getServerAuth();
    
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden - requires super_admin role" }, { status: 403 });
    }

    const id = await resolveBillDocumentId(raw);
    if (!id) {
      return NextResponse.json({ success: false, error: "Bill not found" }, { status: 404 });
    }

    const bill = await sanityClient.fetch(
      `*[_type == "bill" && _id == $id][0]{
        _id,
        billNumber,
        billId,
        serviceType,
        locationType,
        billDate,
        dueDate,
        notes,
        visitingCharges,
        repairFee,
        discount,
        subtotal,
        totalAmount,
        paymentStatus,
        paidAmount,
        balanceAmount,
        status,
        customer->{_id, name, phone},
        items[]{
          productName,
          category,
          brand,
          specifications,
          quantity,
          unitPrice,
          totalPrice,
          unit,
          product->{_id}
        }
      }`,
      { id }
    );

    if (!bill) {
      return NextResponse.json({ success: false, error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: bill }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
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
    const raw = String(fromParams || fromUrl || '').trim();
    
    if (!raw) {
      return NextResponse.json({ success: false, error: "Missing bill id" }, { status: 400 });
    }
    
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const id = await resolveBillDocumentId(raw);
    if (!id) {
      return NextResponse.json({ success: false, error: "Bill not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    const nextItems: any[] = Array.isArray(body?.items) ? body.items : [];
    const serviceType = String(body?.serviceType || "sale");
    const locationType = String(body?.locationType || "shop");
    const billDate = String(body?.billDate || "");
    const dueDate = String(body?.dueDate || "");
    const notes = String(body?.notes || "");

    const visitingCharges = Number(body?.visitingCharges || 0);
    const repairFee = Number(body?.repairFee || 0);
    const discount = Number(body?.discount || 0);

    const paymentStatus = String(body?.paymentStatus || "pending");
    const paidAmount = Number(body?.paidAmount || 0);
    const balanceAmount = Number(body?.balanceAmount ?? 0);

    const prev = await sanityClient.fetch(
      `*[_type == "bill" && _id == $id][0]{
        _id,
        billNumber,
        customer->{_id, phone, name},
        items[]{ quantity, unitPrice, product->{_id} },
        discount,
        visitingCharges,
        repairFee,
        totalAmount,
        paidAmount,
        balanceAmount,
        paymentStatus,
        status,
        serviceType,
        dueDate,
        technician->{_id, name}
      }`,
      { id }
    );

    if (!prev) {
      return NextResponse.json({ success: false, error: "Bill not found" }, { status: 404 });
    }

    const safeItems = nextItems.map((it) => {
      const quantity = Number(it?.quantity || 0);
      const unitPrice = Number(it?.unitPrice || 0);
      const totalPrice = Number(it?.totalPrice ?? quantity * unitPrice);
      const productRef = it?.productId
        ? { _type: "reference", _ref: String(it.productId) }
        : it?.product?._ref
          ? { _type: "reference", _ref: String(it.product._ref) }
          : it?.product?._id
            ? { _type: "reference", _ref: String(it.product._id) }
            : null;

      return {
        productName: String(it?.productName || it?.name || ""),
        category: String(it?.category || ""),
        brand: String(it?.brand || ""),
        specifications: it?.specifications ?? "",
        quantity,
        unitPrice,
        totalPrice,
        unit: String(it?.unit || "pcs"),
        product: productRef,
      };
    });

    const totals = calcTotals({
      items: safeItems,
      visitingCharges,
      repairFee,
      discount,
    });

    const nextBalance = typeof body?.balanceAmount !== "undefined"
      ? Number(balanceAmount)
      : Math.max(0, totals.netPayable - Number(paidAmount || 0));

    const prevMap: Record<string, number> = {};
    for (const it of (prev.items || []) as any[]) {
      const pid = it?.product?._id;
      if (!pid) continue;
      prevMap[String(pid)] = (prevMap[String(pid)] || 0) + Number(it?.quantity || 0);
    }

    const nextMap: Record<string, number> = {};
    for (const it of safeItems) {
      const pid = it?.product?._ref;
      if (!pid) continue;
      nextMap[String(pid)] = (nextMap[String(pid)] || 0) + Number(it?.quantity || 0);
    }

    const allIds = new Set<string>([...Object.keys(prevMap), ...Object.keys(nextMap)]);
    const reduceItems: Array<{ productId: string; quantity: number; unitPrice?: number }> = [];
    const restoreItems: Array<{ productId: string; quantity: number; unitPrice?: number }> = [];
    for (const pid of allIds) {
      const before = Number(prevMap[pid] || 0);
      const after = Number(nextMap[pid] || 0);
      const delta = after - before;
      if (delta > 0) reduceItems.push({ productId: pid, quantity: delta });
      if (delta < 0) restoreItems.push({ productId: pid, quantity: Math.abs(delta) });
    }

    try {
      if (restoreItems.length) {
        await updateStockForBill(restoreItems, id, "restore");
      }
      if (reduceItems.length) {
        await updateStockForBill(reduceItems, id, "reduce");
      }
    } catch {
      // best-effort
    }

    const patch = {
      serviceType,
      locationType,
      billDate,
      dueDate,
      notes,
      items: safeItems,
      visitingCharges: totals.visitingCharges,
      repairFee: totals.repairFee,
      subtotal: totals.subtotal,
      discount: totals.discount,
      totalAmount: totals.grossTotal,
      paymentStatus,
      paidAmount,
      balanceAmount: nextBalance,
      updatedAt: new Date().toISOString(),
    };

    const updated = await sanityClient.patch(id).set(patch).commit();
    // Central WhatsApp event: comprehensive bill change detection (fire-and-forget)
    try {
      const next = {
        ...patch,
        _id: id,
        billNumber: prev?.billNumber || id,
        customer: prev?.customer,
        technician: prev?.technician,
        paymentMethod: (body as any)?.paymentMode || (body as any)?.paymentMethod || prev?.paymentMethod || "manual",
      };
      const events = resolveBillEvents(prev, next, body as Record<string, any>);
      emitBillEventsInBackground(events);
    } catch (e) {
      console.error("[WA] bill event dispatch failed", e);
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    // Derive bill id from params or fallback to URL path as a safety net (handles trailing slashes)
    const fromParams = (params as any)?.id as string | undefined;
    const fromUrl = (() => {
      try {
        const u = new URL(_req.url);
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
    const raw = String(fromParams || fromUrl || '').trim();
    
    if (!raw) {
      return NextResponse.json({ success: false, error: "Missing bill id" }, { status: 400 });
    }
    
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const id = await resolveBillDocumentId(raw);
    if (!id) {
      return NextResponse.json({ success: false, error: "Bill not found" }, { status: 404 });
    }

    // Fetch bill items snapshot so we can restore inventory before deleting the bill.
    const bill = await sanityClient.fetch(
      `*[_type == "bill" && _id == $id][0]{
        _id,
        billNumber,
        totalAmount,
        serviceType,
        customer->{phone,name},
        items[]{
          quantity,
          unitPrice,
          product->{_id}
        }
      }`,
      { id }
    );

    const itemsForRestore = Array.isArray(bill?.items)
      ? (bill.items as any[])
          .filter((it) => it?.product?._id && Number(it?.quantity || 0) > 0)
          .map((it) => ({
            productId: String(it.product._id),
            quantity: Number(it.quantity || 0),
            unitPrice:
              typeof it.unitPrice === "number" ? Number(it.unitPrice) : undefined,
          }))
      : [];

    // Delete related documents that directly reference this bill.
    const dependentDocumentIds = await getBillDependentDocumentIds(id);

    // For Super Admin delete flow, do not hard-block on remaining references.
    // Sanity allows dangling refs; we prefer deletion to proceed and log context.
    const remainingReferences = await getRemainingBillReferences(id);
    if (remainingReferences.length) {
      const grouped = remainingReferences.reduce<Record<string, number>>((acc, ref) => {
        acc[ref._type] = (acc[ref._type] || 0) + 1;
        return acc;
      }, {});
      console.warn(
        "[API] DELETE /api/super/bills continuing with dangling refs:",
        grouped,
      );
    }

    const tx = sanityClient.transaction();
    for (const referenceId of Array.from(new Set(dependentDocumentIds || []).values())) {
      tx.delete(String(referenceId));
    }
    tx.delete(id);

    // Restore inventory stock (uses its own commits internally). Best-effort.
    try {
      if (itemsForRestore.length) {
        await updateStockForBill(itemsForRestore, id, "restore");
      }
    } catch (invErr) {
      console.warn("[API] DELETE /api/super/bills: inventory restore failed", invErr);
    }

    await tx.commit();

    // Central WhatsApp event: bill deleted (fire-and-forget)
    try {
      void emitWaEventServer("bill-deleted", {
        billId: id,
        billNumber: bill?.billNumber || id,
        customerName: bill?.customer?.name || "Customer",
        customerPhone: bill?.customer?.phone || "",
        totalAmount: bill?.totalAmount || 0,
        serviceName: bill?.serviceType || "",
        eventId: id,
        idempotencyKey: `billDeleted:${id}`,
      }).then((result) => {
        if (!result.ok) console.warn("[WA] bill deleted event failed", result.error);
      });
    } catch {
      // best-effort
    }
    return NextResponse.json({ success: true, message: "Bill deleted" });
  } catch (error: any) {
    console.error("API: Failed to delete bill", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete bill" },
      { status: 500 }
    );
  }
}
