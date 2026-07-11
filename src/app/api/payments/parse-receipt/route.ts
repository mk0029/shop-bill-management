import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";

export const maxDuration = 60;

const BACKEND_URL = process.env.PAYMENT_VERIFICATION_API_URL || "https://shop-wa-bot-keu5.onrender.com";
const WA_API_KEY = process.env.WA_API_KEY || "3d3a7f2c3bwldkkfjwdbwdfwrfewrfewrfewrfewf2344r45454r323443re23fet34trwfwef23rf24gt34t5rt4252544242242314re2fwrfer4r3gdf4b69a9d9d5a0b0d8c1b5";

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.ocrText) {
      return NextResponse.json(
        { success: false, error: "OCR text is required." },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${BACKEND_URL}/api/payment-verification/parse-receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": WA_API_KEY,
      },
      body: JSON.stringify({ ocrText: body.ocrText }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `Backend returned non-JSON response (HTTP ${response.status}). The verification server may be unavailable.`,
          rawResponse: text.substring(0, 500),
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.ok ? 200 : 400 });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        { success: false, error: "Verification server timed out. Please try again." },
        { status: 504 }
      );
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
