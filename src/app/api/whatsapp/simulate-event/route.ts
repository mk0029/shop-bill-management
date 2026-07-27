import { renderWhatsAppEvent, sendViaWaBotServer } from "@/lib/wa-bot-server"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { eventType, phone, payload, previewOnly } = body

    if (!eventType || typeof eventType !== "string") {
      return Response.json({ ok: false, error: "eventType is required" }, { status: 400 })
    }
    if (!phone || typeof phone !== "string") {
      return Response.json({ ok: false, error: "phone is required" }, { status: 400 })
    }

    const normalizedPhone = phone.replace(/\D/g, "")
    if (normalizedPhone.length < 10) {
      return Response.json({ ok: false, error: "Invalid phone number" }, { status: 400 })
    }
    const rendered = renderWhatsAppEvent(eventType, {
      ...(payload && typeof payload === "object" ? payload : {}),
      phone: normalizedPhone,
      customerPhone: normalizedPhone,
      technicianPhone: normalizedPhone,
    })
    if (!rendered) return Response.json({ ok: false, error: `No template mapping or recipient for event: ${eventType}` }, { status: 400 })
    if (previewOnly) return Response.json({ ok: true, previewOnly: true, message: rendered.message, templateName: rendered.templateName })

    const result = await sendViaWaBotServer({ phone: rendered.phone, message: rendered.message, eventType })
    if (!result.ok || result.failed > 0) {
      return Response.json({ ok: false, error: result.error || result.results.find((item) => !item.ok)?.error || "Send failed" }, { status: 502 })
    }
    return Response.json({ ok: true, message: rendered.message, templateName: rendered.templateName, result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ ok: false, error: `Simulate proxy failed: ${msg}` }, { status: 502 })
  }
}
