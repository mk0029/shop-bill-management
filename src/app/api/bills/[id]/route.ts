/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { sanityApiService } from "@/lib/sanity-api-service";
import { notificationService } from "@/lib/notification-service";
import { emitWaEventServer } from "@/lib/wa-bot-server";
import { getServerAuth } from "@/lib/server-auth";
import { updateStockForBill } from "@/lib/inventory-management";
import { getActiveAdminUserIds, createAndDispatchNotification } from "@/services/notifications/notification-events.server";
import { safeUserName } from "@/lib/display-text";
import { resolveBillEvents, emitBillEventsInBackground } from "@/lib/bill-events";
import { calculatePaymentWithRoundFigureDiscount, toMoney, BILL_EPSILON } from "@/lib/bill-utils";
import {
  calculateAdvanceForPayment,
  fetchCustomerAdvanceBalance,
  updateCustomerAdvanceBalance,
  createAdvanceTransaction,
} from "@/lib/customer-advance";
import { logBillEvent, buildPaymentDescription } from "@/lib/bill-timeline-service";

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

    if (auth.role !== "admin" && auth.role !== "super_admin" && auth.role !== "technician") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only admin can update bills" },
        { status: 403 }
      );
    }

    if (!process.env.SANITY_API_TOKEN) {
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

    // Fetch bill snapshot ONCE with all fields needed downstream
    const prev = await (async () => {
      try {
        return await sanityClient.fetch(
          `*[_type == "bill" && _id == $id][0]{
            _id, billNumber, status, paymentStatus, totalAmount, discount,
            paidAmount, balanceAmount, paymentMethod, paymentDate, serviceType, dueDate,
            advanceApplied, advanceCreated, paymentBeforeAdvance, finalCustomerPayment,
            technician->{_id, name},
            customer->{_id, phone, name, advanceBalance}
          }`,
          { id }
        );
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
      "paymentMethod",
      "paymentDate",
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
      "advanceApplied",
      "advanceCreated",
      "paymentBeforeAdvance",
      "finalCustomerPayment",
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
      "paymentMethod",
      "paymentDate",
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
      "advanceApplied",
      "advanceCreated",
      "paymentBeforeAdvance",
      "finalCustomerPayment",
    ]);
    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (allowedKeys.has(k)) updates[k] = v;
    }
    // Always set updatedAt
    updates["updatedAt"] = new Date().toISOString();

    // Compute payment delta from prev + body
    const prevPaid = Number(prev?.paidAmount ?? 0);
    const nextPaid = typeof body.paidAmount !== "undefined" ? Number(body.paidAmount) : undefined;
    const paymentDelta = typeof nextPaid === "number" && Number.isFinite(nextPaid) ? nextPaid - prevPaid : 0;

    // Calculate round figure discount if applicable (only for individual payments)
    if (paymentDelta > 0 && prev) {
      const paidAmount = toMoney(prev.paidAmount || 0);
      const totalAmount = toMoney(prev.totalAmount || 0);
      const existingDiscount = toMoney(prev.discount || 0);
      const grandTotal = Math.max(0, totalAmount - existingDiscount);
      const paymentWithRoundFigure = calculatePaymentWithRoundFigureDiscount({
        grandTotal,
        alreadyPaid: paidAmount,
        discountAmount: 0,
        paymentAmount: paymentDelta,
      });
      const roundFigureDiscount = paymentWithRoundFigure.roundFigureDiscount;
      if (roundFigureDiscount.shouldApply && roundFigureDiscount.discountAmount > 0) {
        updates["discount"] = (Number(updates["discount"]) || 0) + roundFigureDiscount.discountAmount;
        updates["discountReason"] = updates["discountReason"] || "Round Figure Discount";
      }
    }

  // Patch published doc
    const updated = await sanityClient.patch(id).set(updates).commit();

    // Build "next" state from prev + updates for downstream events
    const next = prev ? { ...prev, ...updates } : prev;

    // Central WhatsApp event: comprehensive bill change detection (fire-and-forget)
    emitBillEventsInBackground(resolveBillEvents(prev, next, body as Record<string, any>));

    // Unified notification: bill status/payment update (fire-and-forget)
    try {
      const actorUserId = String(auth.userId || req.headers.get('x-user-id') || '').trim()
      const changedKeys = ["status", "paymentStatus", "paidAmount", "balanceAmount"].filter(
        (key) => typeof (updates as any)[key] !== "undefined",
      );
      if (actorUserId && changedKeys.length && next) {
        const customerId = next?.customer?._id ? String(next.customer._id) : undefined
        const billNumber = String(next?.billNumber || id)
        const statusText = String(next?.status || "")
        const paymentText = String(next?.paymentStatus || "")
        const suffix = changedKeys
          .map((key) => `${key}-${String((updates as any)[key])}`)
          .join(".")
          .replace(/[^a-zA-Z0-9_.-]/g, "-")

        const title = 'Bill updated by Admin'
        const bodyText = `Bill ${billNumber} was updated by Admin. Review changes by clicking here.`
        const adminRoute = `/admin/billing?open=${encodeURIComponent(String(id))}`
        const customerRoute = `/customer/bills?open=${encodeURIComponent(String(id))}`

        const advanceAppliedNotify = toMoney(body?.advanceApplied ?? 0)
        const advanceCreatedNotify = toMoney(body?.advanceCreated ?? 0)
        const advanceData: Record<string, unknown> = {}
        if (advanceAppliedNotify > 0) advanceData.advanceApplied = advanceAppliedNotify
        if (advanceCreatedNotify > 0) advanceData.advanceCreated = advanceCreatedNotify

        const notificationPayload = {
          type: 'billing.updated' as const,
          actorUserId,
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
            ...advanceData,
          },
          skipActor: true,
        };

        getActiveAdminUserIds().then((adminUserIds) => {
          if (adminUserIds?.length) {
            createAndDispatchNotification({
              ...notificationPayload,
              eventId: `billing.updated.${String(id)}.admins.${suffix}`,
              userIds: adminUserIds,
            }).catch(() => {});
          }
        }).catch(() => {});

        if (customerId) {
          createAndDispatchNotification({
            ...notificationPayload,
            eventId: `billing.updated.${String(id)}.customer.${customerId}.${suffix}`,
            userId: String(customerId),
            data: { ...notificationPayload.data, route: customerRoute, route_path: customerRoute },
          }).catch(() => {});
        }
      }
    } catch (notifyErr) {
      console.error('[Notify] billing.updated event failed', notifyErr)
    }
    
    // Advance payment logic: compute if excess payment creates advance balance
    let advanceCreatedAmount = 0;
    let advanceAppliedAmount = 0;
    let paymentBeforeAdvance = 0;
    let finalCustomerPayment = 0;

    if (paymentDelta > 0 && prev?.customer) {
      const customerId = prev.customer._id;
      const totalAmount = toMoney(prev.totalAmount || 0);
      const existingDiscount = toMoney(prev.discount || 0);
      const grandTotal = Math.max(0, totalAmount - existingDiscount);
      const paidAmount = toMoney(prev.paidAmount || 0);
      const newPaidAmount = paidAmount + paymentDelta;
      const remainingAfterPayment = Math.max(0, grandTotal - newPaidAmount);
      const isFullyPaid = remainingAfterPayment <= BILL_EPSILON;

      if (isFullyPaid && newPaidAmount > grandTotal) {
        const excess = newPaidAmount - grandTotal;
        advanceCreatedAmount = excess;
        finalCustomerPayment = grandTotal;
        paymentBeforeAdvance = newPaidAmount;
      } else {
        finalCustomerPayment = newPaidAmount;
        paymentBeforeAdvance = newPaidAmount;
      }
    }

    // If advance was created, update customer balance and create transaction
    if (advanceCreatedAmount > 0 && prev?.customer) {
      const customerId = prev.customer._id;
      const billNumber = prev.billNumber || id;
      (async () => {
        try {
          await updateCustomerAdvanceBalance(customerId, advanceCreatedAmount);
          await createAdvanceTransaction({
            customerId,
            billId: id,
            amount: advanceCreatedAmount,
            type: "created",
            reason: "excess_payment",
            reference: `Bill ${billNumber}`,
            createdBy: auth.userId || "system",
          });
        } catch (err) {
          console.error("[Advance] Failed to update balance:", err);
        }
      })();
    }

    // If advance was applied (from frontend), update balance and create transaction
    const advanceApplied = toMoney(body?.advanceApplied ?? 0);
    if (advanceApplied > 0 && prev?.customer) {
      const customerId = prev.customer._id;
      const billNumber = prev.billNumber || id;
      (async () => {
        try {
          await updateCustomerAdvanceBalance(customerId, -advanceApplied);
          await createAdvanceTransaction({
            customerId,
            billId: id,
            amount: advanceApplied,
            type: "used",
            reason: "applied_to_bill",
            reference: `Bill ${billNumber}`,
            createdBy: auth.userId || "system",
          });
        } catch (err) {
          console.error("[Advance] Failed to apply advance:", err);
        }
      })();
    }

    // Set advance fields on bill if applicable
    if (advanceCreatedAmount > 0 || advanceApplied > 0 || toMoney(body?.finalCustomerPayment) > 0) {
      updates["advanceApplied"] = advanceApplied > 0 ? advanceApplied : toMoney(prev?.advanceApplied ?? 0);
      updates["advanceCreated"] = advanceCreatedAmount > 0 ? advanceCreatedAmount : toMoney(prev?.advanceCreated ?? 0) + (toMoney(body?.advanceCreated ?? 0));
      updates["paymentBeforeAdvance"] = paymentBeforeAdvance > 0 ? paymentBeforeAdvance : toMoney(prev?.paymentBeforeAdvance ?? 0);
      updates["finalCustomerPayment"] = finalCustomerPayment > 0 ? finalCustomerPayment : toMoney(prev?.finalCustomerPayment ?? 0) + (toMoney(body?.finalCustomerPayment ?? 0));
    }

    // Define shared timestamp for downstream operations
    const paymentTimestamp = String(updates["paymentDate"] || prev?.paymentDate || new Date().toISOString());

    // Create cash book entry asynchronously (fire-and-forget, reuse prev data)
    if (paymentDelta > 0 && prev?.customer) {
      (async () => {
        try {
          const paidAmount = toMoney(prev.paidAmount || 0);
          const totalAmount = toMoney(prev.totalAmount || 0);
          const existingDiscount = toMoney(prev.discount || 0);
          const grandTotal = Math.max(0, totalAmount - existingDiscount);
          const paymentWithRoundFigure = calculatePaymentWithRoundFigureDiscount({
            grandTotal,
            alreadyPaid: paidAmount,
            discountAmount: 0,
            paymentAmount: paymentDelta,
          });
          const roundFigureDiscount = paymentWithRoundFigure.roundFigureDiscount;
          let newTotalDiscount = existingDiscount;
          let discountReason = "";
          if (roundFigureDiscount.shouldApply) {
            newTotalDiscount = Math.max(existingDiscount, roundFigureDiscount.discountAmount);
            discountReason = "Round Figure Discount";
          }
          const finalPaidAmount = roundFigureDiscount.finalPaidAmount;
          const finalRemaining = roundFigureDiscount.finalRemaining;
          const paymentStatus = finalRemaining <= BILL_EPSILON ? 'paid' : 'partial';

          const customer = prev.customer;
          const transactionId = `pmt_${id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const result = await sanityApiService.cashBook.createEntryFromBillPayment({
            billId: id,
            userId: customer._id,
            userName: safeUserName(customer.name, "Customer"),
            amount: Number(finalPaidAmount),
            paymentType: 'credit',
            paymentDate: paymentTimestamp,
            billNumber: prev.billNumber,
            totalAmount,
            paymentStatus,
            transactionId,
          });
          if (!result.success) {
            console.error('Failed to create cash book entry via bill API:', result.error);
          }
          // Post-payment reconciliation validation
          if (result.success && result.data) {
            try {
              const entryId = result.data._id || result.data;
              const savedEntry = await sanityClient.fetch(
                `*[_id == $entryId]{_id, createdAt, amount, transactionId, bill{_ref}}[0]`,
                { entryId }
              );
              if (savedEntry) {
                const entryDate = new Date(savedEntry.createdAt).toISOString().split('T')[0];
                const paymentDate = new Date(paymentTimestamp).toISOString().split('T')[0];
                if (entryDate !== paymentDate) {
                  console.error(`[RECONCILIATION] Cash book entry date mismatch: entry createdAt=${savedEntry.createdAt} (${entryDate}) vs paymentTimestamp=${paymentTimestamp} (${paymentDate}). Bill: ${prev.billNumber}, Amount: ₹${finalPaidAmount - paidAmount}`);
                }
                if (!savedEntry.transactionId) {
                  console.error(`[RECONCILIATION] Cash book entry missing transactionId. Entry: ${entryId}, Bill: ${prev.billNumber}`);
                }
              } else {
                console.error(`[RECONCILIATION] Cash book entry ${entryId} not found after creation for bill ${prev.billNumber}`);
              }
            } catch (valErr) {
              console.error('[RECONCILIATION] Validation check failed:', valErr);
            }
          }
        } catch (cashBookError) {
          console.error('Error creating cash book entry in bill API:', cashBookError);
        }
      })();
    }

    // Log timeline events (await each to ensure they actually write)
    if (prev) {
      const changes: Array<{ field: string; label: string; oldValue?: string; newValue?: string }> = [];
      const loggedEventTypes = new Set<string>();
      const actorInfo = { actorUserId: auth.userId || "", actorName: auth.name || "Admin", actorRole: auth.role || "admin" };

      // Payment received
      if (paymentDelta > 0 && prev.customer) {
        const amount = Number(updates["paidAmount"] || 0) - toMoney(prev.paidAmount || 0);
        const method = String(updates["paymentMethod"] || prev.paymentMethod || "");
        try {
          const evResult = await logBillEvent({
            billId: id,
            eventType: "payment_received",
            timestamp: paymentTimestamp,
            ...actorInfo,
            description: buildPaymentDescription({ amount, method, billNumber: prev.billNumber }),
            paymentAmount: amount,
            paymentMethod: method,
            isPublic: true,
          });
          if (!evResult.success) console.error("[Timeline] payment_received failed:", evResult.error);
        } catch (tlErr) {
          console.error("[Timeline] payment_received threw:", tlErr);
        }
        loggedEventTypes.add("payment_received");
      }

      // Payment updated (decreased)
      if (paymentDelta < 0) {
        try {
          const evResult = await logBillEvent({
            billId: id,
            eventType: "payment_updated",
            timestamp: new Date().toISOString(),
            ...actorInfo,
            description: `Payment adjusted by ₹${Math.abs(paymentDelta)}`,
            previousValues: { paidAmount: prev.paidAmount },
            newValues: { paidAmount: updates["paidAmount"] },
            isPublic: true,
          });
          if (!evResult.success) console.error("[Timeline] payment_updated failed:", evResult.error);
        } catch (tlErr) {
          console.error("[Timeline] payment_updated threw:", tlErr);
        }
        loggedEventTypes.add("payment_updated");
      }

      // Status changed
      const newStatus = updates["paymentStatus"] as string;
      const oldStatus = prev.paymentStatus;
      if (newStatus && newStatus !== oldStatus) {
        const statusLabels: Record<string, string> = {
          pending: "Pending", partial: "Partially Paid", paid: "Paid", overdue: "Overdue",
        };
        changes.push({
          field: "paymentStatus",
          label: "Payment Status",
          oldValue: statusLabels[oldStatus] || oldStatus,
          newValue: statusLabels[newStatus] || newStatus,
        });
      }

      // Advance adjusted
      const advanceAppliedAmt = toMoney(body?.advanceApplied ?? 0);
      const advanceCreatedAmt = toMoney(body?.advanceCreated ?? 0);
      if (advanceAppliedAmt > 0 || advanceCreatedAmt > 0) {
        try {
          const evResult = await logBillEvent({
            billId: id,
            eventType: "advance_adjusted",
            timestamp: new Date().toISOString(),
            ...actorInfo,
            description: advanceAppliedAmt > 0
              ? `₹${advanceAppliedAmt.toLocaleString()} applied from advance balance`
              : `₹${advanceCreatedAmt.toLocaleString()} added as advance balance`,
            paymentAmount: advanceAppliedAmt || advanceCreatedAmt,
            isPublic: true,
          });
          if (!evResult.success) console.error("[Timeline] advance_adjusted failed:", evResult.error);
        } catch (tlErr) {
          console.error("[Timeline] advance_adjusted threw:", tlErr);
        }
        loggedEventTypes.add("advance_adjusted");
      }

      // Bill edited (other field changes)
      const trackedFields: Record<string, string> = {
        discount: "Discount",
        dueDate: "Due Date",
        notes: "Notes",
        internalNotes: "Internal Notes",
        items: "Items",
        visitingCharges: "Visiting Charges",
        transportationFee: "Transportation Fee",
        repairFee: "Repair Fee",
        subtotal: "Subtotal",
        totalAmount: "Total Amount",
        serviceType: "Service Type",
        locationType: "Location Type",
        technician: "Technician",
      };
      for (const [field, label] of Object.entries(trackedFields)) {
        if (field in updates && !loggedEventTypes.has("bill_edited")) {
          const oldVal = String((prev as any)[field] ?? "");
          const newVal = String(updates[field] ?? "");
          if (oldVal !== newVal) {
            changes.push({ field, label, oldValue: oldVal, newValue: newVal });
          }
        }
      }

      if (changes.length > 0 && !loggedEventTypes.has("payment_received") && !loggedEventTypes.has("payment_updated")) {
        const eventType = changes.some(c => c.field === "paymentStatus") ? "status_changed" : "bill_edited" as const;
        try {
          const evResult = await logBillEvent({
            billId: id,
            eventType,
            timestamp: new Date().toISOString(),
            ...actorInfo,
            description: changes.map(c => `${c.label}: ${c.oldValue || "(empty)"} → ${c.newValue || "(empty)"}`).join(", "),
            changes,
            isPublic: true,
          });
          if (!evResult.success) console.error(`[Timeline] ${eventType} failed:`, evResult.error);
        } catch (tlErr) {
          console.error(`[Timeline] ${eventType} threw:`, tlErr);
        }
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

    // Log timeline event: bill cancelled (fire-and-forget)
    try {
      void logBillEvent({
        billId: id,
        eventType: "bill_cancelled",
        timestamp: new Date().toISOString(),
        actorUserId: auth.userId || "",
        actorName: auth.name || "Admin",
        actorRole: auth.role || "super_admin",
        description: `Bill ${bill?.billNumber || id} deleted by ${auth.name || "Admin"}`,
        notes: "Bill permanently deleted from system",
        isPublic: true,
      });
    } catch {}

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
