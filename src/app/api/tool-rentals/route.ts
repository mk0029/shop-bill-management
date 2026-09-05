import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";
import { toolRentalService } from "@/lib/tool-rental-service";

function canManage(role: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
}

export async function GET(req: NextRequest) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  try {
    const rentals = await toolRentalService.getToolRentals();
    if (auth.role === "customer") {
      const matchIds = new Set(
        [auth.userId, auth.customerId].filter(Boolean).map((v) => String(v)),
      );
      const mine = (rentals || []).filter((r) => {
        const cid = String(r.customerId || "");
        const cref = String(r.customerRefId || "");
        return matchIds.has(cid) || matchIds.has(cref);
      });
      return NextResponse.json({ success: true, data: mine });
    }
    if (!canManage(auth.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ success: true, data: rentals });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load rentals" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !canManage(auth.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({} as any));
  if (!body?.customer?._id || !body?.tool?._id || !body?.durationType || !body?.durationValue) {
    return NextResponse.json(
      { success: false, error: "Customer, tool, duration type and duration value are required" },
      { status: 400 },
    );
  }
  try {
    const rental = await toolRentalService.createToolRental({
      customer: body.customer,
      tool: body.tool,
      durationType: body.durationType,
      durationValue: Number(body.durationValue),
      paidAmount: Number(body.paidAmount ?? 0),
      notes: String(body.notes ?? ""),
      createdBy: String(body.createdBy ?? auth.userId ?? ""),
      depositAmount: Number(body.depositAmount ?? 0),
    });
    return NextResponse.json({ success: true, data: rental });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to create rental" },
      { status: 500 },
    );
  }
}