import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";
import {
  getShopStatusMessages,
  saveShopStatusMessages,
} from "@/lib/shop-status-messages.server";

function canManage(role: string | null) {
  return role === "admin" || role === "super_admin";
}

export async function GET() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const messages = await getShopStatusMessages();
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load messages",
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !canManage(auth.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const messages = await saveShopStatusMessages(body?.messages);
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save messages",
      },
      { status: 500 },
    );
  }
}
