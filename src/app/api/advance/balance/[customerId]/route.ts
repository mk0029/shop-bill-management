import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";

export async function GET(
  _req: Request,
  { params }: { params: { customerId: string } }
) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { customerId } = params;
    if (!customerId) {
      return NextResponse.json({ success: false, error: "Missing customerId" }, { status: 400 });
    }

    const result = await sanityClient.fetch(
      `*[_type == "user" && _id == $customerId][0]{
        _id, name, advanceBalance, lifetimeAdvanceCreated, lifetimeAdvanceUsed
      }`,
      { customerId }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        advanceBalance: Number(result.advanceBalance || 0),
        lifetimeAdvanceCreated: Number(result.lifetimeAdvanceCreated || 0),
        lifetimeAdvanceUsed: Number(result.lifetimeAdvanceUsed || 0),
      },
    });
  } catch (error: any) {
    console.error("[AdvanceBalance] Failed to fetch:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch advance balance" },
      { status: 500 }
    );
  }
}
