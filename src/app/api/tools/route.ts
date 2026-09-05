import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";
import { toolRentalService } from "@/lib/tool-rental-service";

function canManage(role: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
}

export async function GET(req: NextRequest) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !canManage(auth.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  try {
    if (id) {
      const tool = await toolRentalService.getToolById(id);
      if (!tool) {
        return NextResponse.json({ success: false, error: "Tool not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: tool });
    }
    const tools = await toolRentalService.getTools();
    return NextResponse.json({ success: true, data: tools });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load tools" },
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
  if (!body?.toolName || !body?.toolCode || !body?.category) {
    return NextResponse.json(
      { success: false, error: "Tool name, code and category are required" },
      { status: 400 },
    );
  }
  try {
    const result = await toolRentalService.createTool(body);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to create tool" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !canManage(auth.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({} as any));
  if (!body?.id) {
    return NextResponse.json({ success: false, error: "Tool id is required" }, { status: 400 });
  }
  const { id, ...payload } = body;
  try {
    const updated = await toolRentalService.updateTool(String(id), payload);
    return NextResponse.json({ success: true, data: { updated } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update tool" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !canManage(auth.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "Tool id is required" }, { status: 400 });
  }
  try {
    const deleted = await toolRentalService.deleteTool(id);
    return NextResponse.json({ success: true, data: { deleted } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to disable tool" },
      { status: 500 },
    );
  }
}