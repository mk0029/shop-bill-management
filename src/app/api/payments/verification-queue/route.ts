import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";

const BACKEND_URL = process.env.PAYMENT_VERIFICATION_API_URL || "https://shop-wa-bot-keu5.onrender.com";
const WA_API_KEY = process.env.WA_API_KEY || "3d3a7f2c3bwldkkfjwdbwdfwrfewrfewrfewrfewf2344r45454r323443re23fet34trwfwef23rf24gt34t5rt4252544242242314re2fwrfer4r3gdf4b69a9d9d5a0b0d8c1b5";

export async function GET(request: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";

    const url = `${BACKEND_URL}/api/payment-verification/queue${status ? `?status=${encodeURIComponent(status)}` : ""}`;
    const response = await fetch(url, {
      headers: { "x-api-key": WA_API_KEY },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
