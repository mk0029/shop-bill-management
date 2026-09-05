import { NextResponse } from "next/server";
import { fetchBills } from "@/lib/sanity/bills-federated";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId") || undefined;

    const bills = await fetchBills({ customerId });

    return NextResponse.json({ success: true, data: bills });
  } catch (error) {
    console.error("/api/bills/federated failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";