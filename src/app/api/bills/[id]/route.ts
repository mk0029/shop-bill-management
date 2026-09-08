/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sanityClient, getSanityClient } from "@/lib/sanity";
import { updateDocument, deleteDocument } from "@/lib/sanity/write-router";
import { fetchBillById } from "@/lib/sanity/bills-federated";
import { sanityApiService } from "@/lib/sanity-api-service";
import { notificationService } from "@/lib/notification-service";
import { getServerAuth } from "@/lib/server-auth";
import { updateStockForBill } from "@/lib/inventory-management";
import { getActiveAdminUserIds, createAndDispatchNotification } from "@/services/notifications/notification-events.server";
import { safeUserName } from "@/lib/display-text";

async function runOnAllDatabases<T>(
  query: string,
  params: Record<string, unknown>
): Promise<T[]> {
  const billingClient = getSanityClient("billing");
  const [primary, billing] = await Promise.allSettled([
    sanityClient.fetch<T[]>(query, params),
    billingClient.fetch<T[]>(query, params),
  ]);
  return [
    ...(primary.status === "fulfilled" ? primary.value : []),
    ...(billing.status === "fulfilled" ? billing.value : []),
  ];
}

async function getBillDependentDocumentIds(billId: string): Promise<string[]> {
  const rows = await runOnAllDatabases<{ _id: string }>(
    `*[_type in ["cashBookEntry","cashbookItem","billMessage","billItem","payment","transaction"] && (bill._ref == $billId || billId == $billId)]._id`,
    { billId }
  );
  return Array.from(new Set(rows.map((r) => String(r._id)))).filter(Boolean);
}

async function getRemainingBillReferences(billId: string): Promise<Array<{ _id: string; _type: string }>> {
  const rows = await runOnAllDatabases<{ _id: string; _type: string }>(
    `*[
      references($billId)
      && !(_type in ["bill","cashBookEntry","cashbookItem","billMessage","billItem","payment","transaction"])
    ]{_id,_type}`,
    { billId }
  );
  const seen = new Set<string>();
  const out: Array<{ _id: string; _type: string }> = [];
  for (const r of rows) {
    const key = `${r._type}:${r._id}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

async function deleteDocBestEffort(docId: string): Promise<void> {
  try {
    await getSanityClient("billing").delete(docId);
    return;
  } catch {}
  try {
    await sanityClient.delete(docId);
  } catch {}
}



export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (auth.role !== "admin" && auth.role !== "super_admin" && auth.role !== "technician") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only admin can update bills" },
        { status: 403 }
      );
    }

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
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing bill id" },
        { status: 400 }
      );
    }

    // Fetch previous snapshot for change detection (best-effort).
    // Bills live in the billing DB (new bills) and/or primary (legacy), so read
    // from both and prefer the billing copy — otherwise prev is null and the
    // cashbook delta computed below would be wrong (full paidAmount).
    const prev = await (async () => {
      try {
        const q = `*[_type == "bill" && _id == $id][0]{
            _id,
            billNumber,
            status,
            paymentStatus,
            totalAmount,
            discount,
            paidAmount,
            balanceAmount,
            serviceType,
            dueDate,
            technician->{_id, name},
            customer->{_id, phone, name},
            _updatedAt
          }`;
        const billingClient = getSanityClient("billing");
        const [billingRes, primaryRes] = await Promise.allSettled([
          billingClient.fetch(q, { id }),
          sanityClient.fetch(q, { id }),
        ]);
        const billing = billingRes.status === "fulfilled" ? billingRes.value : null;
        const primary = primaryRes.status === "fulfilled" ? primaryRes.value : null;
        if (billing && primary) {
          const bt = new Date(billing._updatedAt || 0).getTime();
          const pt = new Date(primary._updatedAt || 0).getTime();
          return bt > pt ? billing : primary;
        }
        return billing || primary;
      } catch {
        return null;
      }
    })();

    const body = await req.json().catch(() => ({}));

    // Admins can update payment fields + bill edit fields (items, charges, etc.)
    // Only truly dangerous fields (customer ref, createdBy, billId) remain super_admin-only.
    const adminSafeKeys = new Set([
      "paymentStatus",
      "paidAmount",
      "balanceAmount",
      "status",
      "notes",
      "internalNotes",
      "discount",
      "items",
      "visitingCharges",
      "transportationFee",
      "repairFee",
      "repairCharges",
      "serviceType",
      "locationType",
      "subtotal",
      "totalAmount",
      "taxAmount",
      "dueDate",
      "priority",
      "technician",
    ]);
    const requestedKeys = Object.keys(body || {});
    const isDraftUpdate =
      id.startsWith("drafts.") || String((prev as any)?.status) === "draft";
    const hasUnsafeKeys = requestedKeys.some(
      (k) => !adminSafeKeys.has(k) && !(isDraftUpdate && k === "customer")
    );
    if (auth.role !== "super_admin" && hasUnsafeKeys) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const allowedKeys = new Set([
      "paymentStatus",
      "paidAmount",
      "balanceAmount",
      "status",
      "notes",
      "internalNotes",
      "discount",
      "items",
      "visitingCharges",
      "transportationFee",
      "repairFee",
      "repairCharges",
      "serviceType",
      "locationType",
      "subtotal",
      "totalAmount",
      "taxAmount",
      "dueDate",
      "priority",
      "technician",
      ...(isDraftUpdate ? ["customer"] : []),
    ]);
    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (allowedKeys.has(k)) updates[k] = v;
    }
    // Always set updatedAt
    updates["updatedAt"] = new Date().toISOString();

    // Patch bill in the billing DB (primary is read-only)
    const startTime = Date.now();
    const updateResult = await updateDocument(id, updates, 'bills');
    if (!updateResult.success) {
      return NextResponse.json(
        { success: false, error: updateResult.error || "Failed to update bill" },
        { status: 500 }
      );
    }

    // Unified notification: bill status/payment update.
    try {
      const actorUserId = String(auth.userId || req.headers.get('x-user-id') || '').trim()
      const changedKeys = ["status", "paymentStatus", "paidAmount", "balanceAmount"].filter(
        (key) => typeof (updates as any)[key] !== "undefined",
      );
      if (actorUserId && changedKeys.length) {
        const bill = await sanityClient.fetch(
          `*[_type == "bill" && _id == $id][0]{ _id, billNumber, customer->{_id}, status, paymentStatus, paidAmount, balanceAmount }`,
          { id }
        )
        const customerId = bill?.customer?._id ? String(bill.customer._id) : undefined
        const billNumber = String(bill?.billNumber || prev?.billNumber || id)
        const statusText = typeof updates.status !== "undefined" ? String(updates.status) : String(bill?.status || "")
        const paymentText = typeof updates.paymentStatus !== "undefined" ? String(updates.paymentStatus) : String(bill?.paymentStatus || "")
        const suffix = changedKeys
          .map((key) => `${key}-${String((updates as any)[key])}`)
          .join(".")
          .replace(/[^a-zA-Z0-9_.-]/g, "-")

        const title = 'Bill updated by Admin'
        const bodyText = `Bill ${billNumber} was updated by Admin. Review changes by clicking here.`
        const adminRoute = `/admin/billing?open=${encodeURIComponent(String(id))}`
        const customerRoute = `/customer/bills?open=${encodeURIComponent(String(id))}`

        await createAndDispatchNotification({
          eventId: `billing.updated.${String(id)}.admins.${suffix}`,
          type: 'billing.updated',
          actorUserId,
          userIds: await getActiveAdminUserIds(),
          title,
          body: bodyText,
          data: {
            billId: String(id),
            billNumber,
            customerId,
            status: statusText,
            paymentStatus: paymentText,
            route: adminRoute,
            route_path: adminRoute,
          },
          skipActor: true,
        })

        if (customerId) {
          await createAndDispatchNotification({
            eventId: `billing.updated.${String(id)}.customer.${customerId}.${suffix}`,
            type: 'billing.updated',
            actorUserId,
            userId: String(customerId),
            title,
            body: bodyText,
            data: {
              billId: String(id),
              billNumber,
              customerId: String(customerId),
              status: statusText,
              paymentStatus: paymentText,
              route: customerRoute,
              route_path: customerRoute,
            },
            skipActor: true,
          })
        }
      }
    } catch (notifyErr) {
      console.error('[Notify] billing.updated event failed', notifyErr)
    }
    
    // Create cash book entry asynchronously (don't wait for it)
    {
      const prevPaid = Number(prev?.paidAmount ?? 0);
      const nextPaid = typeof (updates as any).paidAmount !== "undefined" ? Number((updates as any).paidAmount) : undefined;
      const paymentDelta = typeof nextPaid === "number" && Number.isFinite(nextPaid) ? nextPaid - prevPaid : 0;

      // Only create a cashbook entry for the incremental payment amount (delta)
      // paidAmount is cumulative, so using it directly would create duplicate/incorrect totals.
      if (paymentDelta > 0) {
      const paymentTimestamp = new Date().toISOString();
      // Fire and forget - don't await to avoid slowing down the bill update
      (async () => {
        try {
          // Fetch the bill to get customer details
          const bill = await fetchBillById(id);
          
          if (bill && bill.customer) {
            // Determine payment status from the current paid amount (already includes the delta)
            const paidAmount = Number(bill.paidAmount || 0);
            const totalAmount = Number((bill as any).totalAmount || (bill as any).total || 0);
            const paymentStatus = totalAmount > 0 && paidAmount >= totalAmount ? 'paid' : 'partial';

            const result = await sanityApiService.cashBook.createEntryFromBillPayment({
              billId: id,
              userId: bill.customer._id,
              userName: safeUserName(bill.customer.name, "Customer"),
              amount: Number(paymentDelta),
              paymentType: 'credit',
              paymentDate: paymentTimestamp,
              billNumber: bill.billNumber,
              totalAmount,
              paymentStatus,
            });
            
            if (result.success) {
              // Unified notification: cashbook entry (admins except actor)
              try {
                const actorUserId = (req.headers.get('x-user-id') || '').trim()
                if (actorUserId) {
                  await notificationService.emit({
                    type: 'cashbook_entry',
                    actorUserId,
                    data: {
                      billId: String(id),
                      customerId: String(bill.customer._id),
                      route: '/admin/cash-book/history',
                      extra: {
                        title: 'Cashbook entry',
                        body: `Payment received Ã¢â‚¬Â¢ Ã¢â€šÂ¹${Number(paymentDelta)}`,
                      },
                    },
                  })
                }
              } catch (notifyErr) {
                console.error('[Notify] cashbook_entry emit failed', notifyErr)
              }
            } else {
              console.error('Ã¢ÂÅ’ Failed to create cash book entry via bill API:', result.error);
            }
          }
        } catch (cashBookError) {
          console.error('Ã¢ÂÅ’ Error creating cash book entry in bill API:', cashBookError);
          // Don't fail the bill update if cash book entry fails
        }
      })(); // Execute async function without awaiting
      }
    }
    
    // Best-effort: also patch draft if it exists (removed — drafts no longer live in primary)
    return NextResponse.json({ success: true, data: { _id: id, ...updates } });
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
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (auth.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing bill id" },
        { status: 400 }
      );
    }

    // Fetch bill items snapshot so we can restore inventory before deleting the bill.
    const bill = await fetchBillById(id).catch(() => null);

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

    // Ensure there are no other remaining references before deleting.
    const remainingReferences = await getRemainingBillReferences(id);
    if (remainingReferences.length) {
      const grouped = remainingReferences.reduce<Record<string, number>>((acc, ref) => {
        acc[ref._type] = (acc[ref._type] || 0) + 1;
        return acc;
      }, {});
      const reasons = Object.entries(grouped)
        .map(([type, count]) => `${count} ${type}${count !== 1 ? "s" : ""}`)
        .join(", ");

      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete bill because other documents still reference it: ${reasons}`,
        },
        { status: 409 }
      );
    }

    // Delete dependent docs across billing + primary DBs (best-effort each).
    await Promise.allSettled(
      dependentDocumentIds.map((refId) => deleteDocBestEffort(refId))
    );

    // Delete the bill itself via the purpose-routed write (billing DB).
    const del = await deleteDocument(id, "bills");
    if (!del.success && !del.error?.toLowerCase().includes("not found")) {
      await deleteDocBestEffort(id);
    }

    // Restore inventory stock (uses its own commits internally). Best-effort.
    try {
      if (itemsForRestore.length) {
        await updateStockForBill(itemsForRestore, id, "restore");
      }
    } catch (invErr) {
      console.warn("[API] DELETE /api/bills: inventory restore failed", invErr);
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
