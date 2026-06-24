/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { sanityApiService } from "@/lib/sanity-api-service";
import { notificationService } from "@/lib/notification-service";
import { sendViaWaBotServer } from "@/lib/wa-bot-server";
import { getServerAuth } from "@/lib/server-auth";
import { updateStockForBill } from "@/lib/inventory-management";
import { getActiveAdminUserIds, createAndDispatchNotification } from "@/services/notifications/notification-events.server";
import { safeUserName } from "@/lib/display-text";

async function getBillDependentDocumentIds(billId: string): Promise<string[]> {
  return await sanityClient.fetch(
    `*[_type in ["cashBookEntry","cashbookItem","billMessage","billItem"] && bill._ref == $billId]._id`,
    { billId }
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

    // Fetch previous snapshot for change detection (best-effort)
    const prev = await (async () => {
      try {
        return await sanityClient.fetch(
          `*[_type == "bill" && _id == $id][0]{
            _id,
            billNumber,
            status,
            paymentStatus,
            totalAmount,
            discount,
            paidAmount,
            balanceAmount,
            serviceType,
            technician->{_id, name},
            customer->{_id, phone, name}
          }`,
          { id }
        );
      } catch {
        return null;
      }
    })();

    const body = await req.json().catch(() => ({}));

    // Super Admin can send broader updates, but this endpoint is also used by normal admins.
    // For safety, block any attempts by non-super-admin to mutate fields outside the admin-safe list.
    const adminSafeKeys = new Set([
      "paymentStatus",
      "paidAmount",
      "balanceAmount",
      "status",
      "notes",
      "internalNotes",
      "discount",
    ]);
    const requestedKeys = Object.keys(body || {});
    const hasUnsafeKeys = requestedKeys.some((k) => !adminSafeKeys.has(k));
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
    ]);
    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (allowedKeys.has(k)) updates[k] = v;
    }
    // Always set updatedAt
    updates["updatedAt"] = new Date().toISOString();

    // Patch published doc
    const startTime = Date.now();
    const updated = await sanityClient.patch(id).set(updates).commit();
    console.log(`updateBill->commit: ${Date.now() - startTime} ms`);

    // WhatsApp via WA bot: payment updates (best-effort)
    try {
      const nextPayStatus = (updates as any)?.paymentStatus;
      const nextPaid = (updates as any)?.paidAmount;
      const nextBal = (updates as any)?.balanceAmount;

      const payChanged = typeof nextPayStatus !== 'undefined' && String(prev?.paymentStatus ?? '') !== String(nextPayStatus ?? '');
      const paidChanged = typeof nextPaid !== 'undefined' && Number(prev?.paidAmount ?? 0) !== Number(nextPaid ?? 0);
      const balChanged = typeof nextBal !== 'undefined' && Number(prev?.balanceAmount ?? 0) !== Number(nextBal ?? 0);

      // Only send WA payment templates when payment related fields change
      if (payChanged || paidChanged || balChanged) {
        const bill = await (async () => {
          try {
            return await sanityClient.fetch(
              `*[_type == "bill" && _id == $id][0]{
                _id,
                billNumber,
                paymentStatus,
                totalAmount,
                discount,
                paidAmount,
                balanceAmount,
                serviceType,
                technician->{name},
                customer->{phone}
              }`,
              { id },
            )
          } catch {
            return null
          }
        })()

        const rawPhone = String(bill?.customer?.phone || prev?.customer?.phone || '').trim();
        const phones = (() => {
          const p = rawPhone;
          if (!p) return [] as string[];
          if (p.startsWith('+')) return [p];
          if (p.startsWith('0')) return [`+91${p.substring(1)}`];
          return [`+91${p}`];
        })();

        const effectivePayStatus = String(bill?.paymentStatus || nextPayStatus || prev?.paymentStatus || '').trim();
        const isPaid = effectivePayStatus === 'paid';
        const isPartial = effectivePayStatus === 'partial';

        // Only send for partial/paid
        if ((isPaid || isPartial) && phones.length) {
          const gross = Number(bill?.totalAmount ?? prev?.totalAmount ?? 0);
          const discount = Number(bill?.discount ?? prev?.discount ?? 0);
          const total = Math.max(0, gross - discount);
          const paid = Number(bill?.paidAmount ?? nextPaid ?? prev?.paidAmount ?? 0);
          const balance = Number(bill?.balanceAmount ?? nextBal ?? prev?.balanceAmount ?? Math.max(0, total - paid));

          const billNo = String(bill?.billNumber || prev?.billNumber || id);
          const techName = safeUserName(bill?.technician?.name || prev?.technician?.name, "");
          const svc = String(bill?.serviceType || prev?.serviceType || '').replace(/_/g, ' ').trim();

          const siteUrl =
            (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://jambh-ell.vercel.app').replace(/\/+$/, '');
          const billLink = siteUrl ? `${siteUrl}/customer/bills?open=${encodeURIComponent(String(id))}` : '';

          const header = isPaid
            ? '✅ Payment Successful — Bill Fully Paid'
            : '✅ Payment Received — Bill is Partial'

          const message =
            `${header}\n\n` +
            `Bill ID: ${billNo}\n` +
            (techName ? `Technician: ${techName}\n` : '') +
            (svc ? `Service: ${svc}\n` : '') +
            `\nPricing Summary:\n` +
            `• Total: ₹${gross.toFixed(2)}\n` +
            (discount > 0 ? `• Discount: ₹${discount.toFixed(2)}\n` : '') +
            `• Paid: ₹${paid.toFixed(2)}\n` +
            `• Balance: ₹${Math.max(0, balance).toFixed(2)}\n\n` +
            `Payment Status: ${isPaid ? 'PAID' : 'PARTIAL'}\n\n` +
            `Thank you for your payment! 🙏  \n` +
            `Your bill has been successfully settled.\n\n` +
            (billLink ? `🔐 Your secure receipt is ready. Click below to view it safely:\n${billLink}` : '')

          await sendViaWaBotServer({ phones, message });
        }
      }
    } catch (e) {
      console.error('[WA] bill_payment_update send failed', e)
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
      // Fire and forget - don't await to avoid slowing down the bill update
      (async () => {
        try {
          // Fetch the bill to get customer details
          const bill = await sanityClient.fetch(`*[_type == "bill" && _id == $id][0]{ _id, billNumber, paidAmount, customer->{_id, name} }`, { id });
          
          if (bill && bill.customer) {
            console.log('💰 Creating cash book entry for bill payment via API:', { billId: id, amount: paymentDelta, prevPaid, nextPaid });
            
            const result = await sanityApiService.cashBook.createEntryFromBillPayment({
              billId: id,
              userId: bill.customer._id,
              userName: safeUserName(bill.customer.name, "Customer"),
              amount: Number(paymentDelta),
              paymentType: 'credit'
            });
            
            if (result.success) {
              console.log('✅ Cash book entry created via bill API');

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
                        body: `Payment received • ₹${Number(paymentDelta)}`,
                      },
                    },
                  })
                }
              } catch (notifyErr) {
                console.error('[Notify] cashbook_entry emit failed', notifyErr)
              }
            } else {
              console.error('❌ Failed to create cash book entry via bill API:', result.error);
            }
          }
        } catch (cashBookError) {
          console.error('❌ Error creating cash book entry in bill API:', cashBookError);
          // Don't fail the bill update if cash book entry fails
        }
      })(); // Execute async function without awaiting
      }
    }
    
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
    const bill = await sanityClient.fetch(
      `*[_type == "bill" && _id == $id][0]{
        _id,
        billNumber,
        customer->{phone},
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
      console.warn("[API] DELETE /api/bills: inventory restore failed", invErr);
    }

    await tx.commit();

    // Best-effort WhatsApp notification
    try {
      const rawPhone = String(bill?.customer?.phone || '').trim();
      const phones = (() => {
        if (!rawPhone) return [] as string[];
        if (rawPhone.startsWith('+')) return [rawPhone];
        if (rawPhone.startsWith('0')) return [`+91${rawPhone.substring(1)}`];
        return [`+91${rawPhone}`];
      })();
      if (phones.length) {
        const billNo = String(bill?.billNumber || id);
        const message = `Bill ${billNo} has been deleted. If you have any questions, please contact Jambh Electrical Services.`;
        await sendViaWaBotServer({ phones, message });
      }
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
