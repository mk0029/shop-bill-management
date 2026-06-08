import { NextRequest, NextResponse } from "next/server";
import { runScheduledGreetings } from "@/services/notifications/scheduled-greetings.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.SCHEDULED_NOTIFICATIONS_SECRET || "";
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

  const force = req.nextUrl.searchParams.get("force") === "1";
  const dateParam = req.nextUrl.searchParams.get("now");
  const now = dateParam ? new Date(dateParam) : new Date();
  if (Number.isNaN(now.getTime())) {
    return NextResponse.json({ success: false, error: "Invalid now date" }, { status: 400 });
  }

  const result = await runScheduledGreetings({ now, force });
  return NextResponse.json({ success: true, ...result });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
