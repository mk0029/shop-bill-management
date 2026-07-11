import { NextRequest, NextResponse } from "next/server";
import { sendManualReminder } from "@/lib/reminders/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.NOTIFY_API_SECRET || "";
  if (!secret && process.env.NODE_ENV !== "production") return true;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const header = req.headers.get("x-cron-secret")?.trim();
  const query = req.nextUrl.searchParams.get("secret")?.trim();
  return Boolean(secret && (bearer === secret || header === secret || query === secret));
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  if (!body.billId && !body.customerId) {
    return NextResponse.json(
      { success: false, error: "billId or customerId is required" },
      { status: 400 },
    );
  }

  const report = await sendManualReminder({
    billId: body.billId,
    customerId: body.customerId,
    channels: body.channels,
    sentBy: body.sentBy || "admin",
  });

  return NextResponse.json({ success: true, ...report });
}

export async function POST(req: NextRequest) {
  return handle(req);
}
