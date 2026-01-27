/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { sanityApiService } from "@/lib/sanity-api-service";
import { notificationService } from "@/lib/notification-service";

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
    const startTime = Date.now();
    const updated = await sanityClient.patch(id).set(updates).commit();
    console.log(`updateBill->commit: ${Date.now() - startTime} ms`);

    // Unified notification: bill status update (only when status is provided)
    try {
      const actorUserId = (req.headers.get('x-user-id') || '').trim()
      if (actorUserId && typeof updates.status !== 'undefined') {
        const bill = await sanityClient.fetch(
          `*[_type == "bill" && _id == $id][0]{ _id, customer->{_id}, status }`,
          { id }
        )
        const customerId = bill?.customer?._id ? String(bill.customer._id) : undefined

        const title = 'Bill status updated'
        const bodyText = `Bill status updated${updates.status ? `: ${String(updates.status)}` : ''}`

        // Admins-only (audience=admins) so admins can see it in /api/notifications/list
        await notificationService.emit({
          type: 'bill_status_updated',
          actorUserId,
          data: {
            billId: String(id),
            status: String(updates.status),
            route: `/admin/billing/history?open=${encodeURIComponent(String(id))}`,
            extra: {
              title,
              body: bodyText,
            },
          },
        })

        // Customer direct notification (audience=users)
        if (customerId) {
          await notificationService.emit({
            type: 'user_direct',
            actorUserId,
            data: {
              customerId: String(customerId),
              route: '/customer',
              message: bodyText,
              extra: {
                targetUserId: String(customerId),
                title,
                body: bodyText,
              },
            },
          })
        }
      }
    } catch (notifyErr) {
      console.error('[Notify] bill_status_updated emit failed', notifyErr)
    }
    
    // Create cash book entry asynchronously (don't wait for it)
    if (updates.paidAmount && Number(updates.paidAmount) > 0) {
      // Fire and forget - don't await to avoid slowing down the bill update
      (async () => {
        try {
          // Fetch the bill to get customer details
          const bill = await sanityClient.fetch(`*[_type == "bill" && _id == $id][0]{ _id, billNumber, paidAmount, customer->{_id, name} }`, { id });
          
          if (bill && bill.customer) {
            console.log('💰 Creating cash book entry for bill payment via API:', { billId: id, amount: updates.paidAmount });
            
            const result = await sanityApiService.cashBook.createEntryFromBillPayment({
              billId: id,
              userId: bill.customer._id,
              userName: bill.customer.name,
              amount: Number(updates.paidAmount),
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
                        body: `Payment received • ₹${Number(updates.paidAmount)}`,
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
