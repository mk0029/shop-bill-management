import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";

const BACKEND_URL = process.env.PAYMENT_VERIFICATION_API_URL || "https://open-wa-bot.onrender.com";
const WA_API_KEY = process.env.WA_API_KEY || "3d3a7f2c3bwldkkfjwdbwdfwrfewrfewrfewrfewf2344r45454r323443re23fet34trwfwef23rf24gt34t5rt4252544242242314re2fwrfer4r3gdf4b69a9d9d5a0b0d8c1b5";

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated || (auth.role !== "admin" && auth.role !== "super_admin")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.paymentId || !body.action) {
      return NextResponse.json(
        { success: false, error: "Payment ID and action are required" },
        { status: 400 }
      );
    }

    const validActions = ["approve", "reject", "mark_paid", "mark_partial"];
    if (!validActions.includes(body.action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    const verifiedBy = (auth as any).user?.name || (auth as any).user?.phone || "admin";

    const response = await fetch(`${BACKEND_URL}/api/payment-verification/admin-verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": WA_API_KEY,
      },
      body: JSON.stringify({
        paymentId: body.paymentId,
        action: body.action,
        verifiedBy,
        notes: body.notes,
        discountApplied: body.discountApplied,
        paidAmount: body.paidAmount,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.ok ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
