/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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
      return NextResponse.json({ success: false, error: "Missing user id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const isActive = typeof body?.isActive === "boolean" ? body.isActive : undefined;
    if (typeof isActive !== "boolean") {
      return NextResponse.json({ success: false, error: "isActive must be boolean" }, { status: 400 });
    }

    const updated = await sanityClient
      .patch(id)
      .set({ isActive, updatedAt: new Date().toISOString() })
      .commit();

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
