import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";
import {
  getWhatsAppMessageStats,
  listWhatsAppMessages,
  processDueWhatsAppMessages,
  retryWhatsAppMessage,
  type WhatsAppMessageStatus,
} from "@/lib/whatsapp/message-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) {
    return { auth, error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }
  if (auth.role !== "admin" && auth.role !== "super_admin") {
    return {
      auth,
      error: NextResponse.json(
        { success: false, error: "Only Admin and Super Admin can access the WhatsApp queue" },
        { status: 403 },
      ),
    };
  }
  return { auth, error: null };
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const statusParam = String(req.nextUrl.searchParams.get("status") || "").trim();
  const validStatuses = ["queued", "sending", "sent", "delivered", "failed", "cancelled"];
  const status = validStatuses.includes(statusParam)
    ? (statusParam as WhatsAppMessageStatus)
    : undefined;

  const [stats, messages] = await Promise.all([
    getWhatsAppMessageStats(),
    listWhatsAppMessages({ limit: 50, status }),
  ]);

  return NextResponse.json({ success: true, stats, messages });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").trim();

  if (action === "process") {
    const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 50);
    const result = await processDueWhatsAppMessages({ limit, timeBudgetMs: 30_000 });
    return NextResponse.json({ success: true, result });
  }

  if (action === "retry") {
    const messageId = String(body.messageId || "").trim();
    if (!messageId) {
      return NextResponse.json({ success: false, error: "messageId is required" }, { status: 400 });
    }
    const result = await retryWhatsAppMessage(messageId);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
