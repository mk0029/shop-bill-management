import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";
import { toolRentalService } from "@/lib/tool-rental-service";

function canManage(role: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !canManage(auth.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const action = String(body?.action || "update");

  try {
    if (action === "return") {
      const rentals = await toolRentalService.getToolRentals();
      const rental = rentals.find((r) => r._id === id);
      if (!rental) {
        return NextResponse.json({ success: false, error: "Rental not found" }, { status: 404 });
      }
      const tool = await toolRentalService.getToolById(rental.toolId);
      if (!tool) {
        return NextResponse.json({ success: false, error: "Tool not found" }, { status: 404 });
      }
      const result = await toolRentalService.markToolReturned(
        rental,
        tool,
        body?.paidAmount != null ? Number(body.paidAmount) : undefined,
      );
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "payment") {
      const currentTotalAmount = Number(body?.currentTotalAmount ?? 0);
      const paidAmount = Number(body?.paidAmount ?? 0);
      const updated = await toolRentalService.markRentalPaid(id, currentTotalAmount, paidAmount);
      return NextResponse.json({ success: true, data: { updated } });
    }

    if (action === "duration") {
      const durationType = String(body?.durationType || "hour");
      const durationValue = Number(body?.durationValue ?? 1);
      const ok = await toolRentalService.updateRentalDuration(id, { durationType: durationType as any, durationValue });
      return NextResponse.json({ success: true, data: { updated: ok } });
    }

    if (action === "update") {
      const patch = body?.patch || { ...body };
      delete patch.action;
      await toolRentalService.updateToolRental(id, patch);
      return NextResponse.json({ success: true, data: { updated: true } });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update rental" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !canManage(auth.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const result = await toolRentalService.deleteToolRental(id);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to delete rental" },
      { status: 500 },
    );
  }
}