import { NextRequest, NextResponse } from "next/server";
import { sendSmtpEmail } from "@/lib/email/server";

export const runtime = "nodejs";

type EmailBody = {
  to?: string;
  from?: string;
  subject?: string;
  text?: string;
  html?: string;
  template?: string;
  data?: Record<string, unknown>;
};

function renderText(body: EmailBody) {
  if (body.text) return body.text;
  if (body.template === "payment-reminder") {
    const data = body.data || {};
    return [
      `Payment reminder for Bill #${String(data.billNumber || "")}`,
      `Amount: ${String(data.amount || "")}`,
      `Due: ${String(data.dueDate || "")}`,
      "Please pay at your convenience.",
      "Thank you, Jambh Electric",
    ].filter(Boolean).join("\n");
  }
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as EmailBody;
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
      text: renderText(body),
      html: body.html,
      template: body.template,
      data: body.data,
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
