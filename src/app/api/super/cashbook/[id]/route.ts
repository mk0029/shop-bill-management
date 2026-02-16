/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const id = String(params?.id || "").trim();
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing cashbook entry id" }, { status: 400 });
    }

    await sanityClient.delete(id);
    return NextResponse.json({ success: true, message: "Cashbook entry deleted" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
