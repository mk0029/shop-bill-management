import { NextResponse } from "next/server";
import { logBillEvent } from "@/lib/bill-timeline-service";
import { getServerAuth } from "@/lib/server-auth";

export async function POST(req: Request) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (!body.billId || !body.eventType) {
      return NextResponse.json(
        { success: false, error: "Missing billId or eventType" },
        { status: 400 }
      );
    }

    const result = await logBillEvent({
      billId: body.billId,
      eventType: body.eventType,
      timestamp: body.timestamp,
      actorUserId: body.actorUserId || auth.userId,
      actorName: body.actorName || auth.name || "Admin",
      actorRole: body.actorRole || auth.role || "admin",
      description: body.description,
      previousValues: body.previousValues,
      newValues: body.newValues,
      changes: body.changes,
      notes: body.notes,
      isPublic: body.isPublic !== false,
      paymentId: body.paymentId,
      paymentAmount: body.paymentAmount,
      paymentMethod: body.paymentMethod,
      cashBookEntryId: body.cashBookEntryId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to log event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, eventId: result.eventId });
  } catch (error: any) {
    console.error("[Timeline API] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
