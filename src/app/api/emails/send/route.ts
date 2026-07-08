import { NextRequest, NextResponse } from "next/server";
import { sendSmtpEmail } from "@/lib/email/server";
import { getServerAuth } from "@/lib/server-auth";
import { isAdminLike } from "@/lib/rbac";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated || !isAdminLike(auth.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const to = String(body.to || "").trim();
    const subject = String(body.subject || "").trim();

    if (!to) {
      return NextResponse.json({ success: false, error: "Email recipient is required" }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ success: false, error: "Email subject is required" }, { status: 400 });
    }

    const result = await sendSmtpEmail({
      to,
      subject,
      text: typeof body.text === "string" ? body.text : "",
      html: typeof body.html === "string" ? body.html : undefined,
      template: typeof body.template === "string" ? body.template : undefined,
      data: body.data as Record<string, unknown> | undefined,
    });

    if (!result.sent) {
      return NextResponse.json(
        {
          success: false,
          sent: false,
          error: result.reason || "Email send failed",
          data: result.data,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ success: true, sent: true, data: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        sent: false,
        error: error instanceof Error ? error.message : "Email send failed",
      },
      { status: 500 },
    );
  }
}
