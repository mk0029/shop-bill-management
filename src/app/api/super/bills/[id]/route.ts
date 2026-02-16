/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";
import { sendViaWaBotServer } from "@/lib/wa-bot-server";
import { updateStockForBill } from "@/lib/inventory-management";

async function resolveBillDocumentId(identifier: string): Promise<string | null> {
  const key = String(identifier || "").trim();
  if (!key) return null;

  // First try as document _id
  const byId = await sanityClient.fetch(
    `*[_type == "bill" && _id == $key][0]{ _id }`,
    { key }
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

function toPhones(rawPhone?: string | null): string[] {
  const p = String(rawPhone || "").trim();
  if (!p) return [];
  if (p.startsWith("+")) return [p];
  if (p.startsWith("0")) return [`+91${p.substring(1)}`];
  return [`+91${p}`];
}

function calcTotals(input: {
  items: Array<{ quantity?: number; unitPrice?: number; totalPrice?: number }>;
  homeVisitFee?: number;
  repairFee?: number;
  discount?: number;
}) {
  const subtotal = (input.items || []).reduce(
    (sum, it) => sum + Number(it.totalPrice ?? Number(it.quantity || 0) * Number(it.unitPrice || 0)),
    0
  );
  const homeVisitFee = Number(input.homeVisitFee || 0);
  const repairFee = Number(input.repairFee || 0);
  const discount = Number(input.discount || 0);
  const grossTotal = Math.max(0, subtotal + homeVisitFee + repairFee);
  const netPayable = Math.max(0, grossTotal - discount);
  return { subtotal, grossTotal, netPayable, homeVisitFee, repairFee, discount };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const raw = String(params?.id || "").trim();
    if (!raw) {
      return NextResponse.json({ success: false, error: "Missing bill id" }, { status: 400 });
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
        homeVisitFee,
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
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const raw = String(params?.id || "").trim();
    if (!raw) {
      return NextResponse.json({ success: false, error: "Missing bill id" }, { status: 400 });
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

    const homeVisitFee = Number(body?.homeVisitFee || 0);
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
        homeVisitFee,
        repairFee,
        totalAmount,
        paidAmount,
        balanceAmount,
        paymentStatus
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
      homeVisitFee,
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
      homeVisitFee: totals.homeVisitFee,
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

    try {
      const phones = toPhones(prev?.customer?.phone);
      if (phones.length) {
        const siteUrl = (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
        const billLink = siteUrl ? `${siteUrl}/customer/bills?open=${encodeURIComponent(String(id))}` : "";
        const billNo = String(prev?.billNumber || id);

        const message =
          `🧾 Your bill has been updated. Please review the changes.\n\n` +
          `Bill: ${billNo}\n` +
          `Total: ₹${Number(totals.grossTotal).toFixed(2)}\n` +
          `Discount: ₹${Number(totals.discount).toFixed(2)}\n` +
          `Net Payable: ₹${Number(totals.netPayable).toFixed(2)}\n\n` +
          (billLink ? `View bill:\n${billLink}` : "");

        await sendViaWaBotServer({ phones, message });
      }
    } catch {
      // best-effort
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
