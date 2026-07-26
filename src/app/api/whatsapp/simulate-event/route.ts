function getOpenWaUrl(): string {
  return (process.env.OPENWA_URL || "http://localhost:2785").replace(/\/+$/, "")
}

function getOpenWaApiKey(): string {
  return process.env.OPENWA_API_KEY || ""
}

function getOpenWaSessionId(): string {
  return process.env.OPENWA_SESSION_ID || "6e19b3d4-383f-4c5d-bd3f-70ce106643fe"
}

function phoneToChatId(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 10) return ""
  const national = digits.length > 10 ? digits.slice(-10) : digits
  return `91${national}@c.us`
}

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

    const chatId = phoneToChatId(phone)
    if (!chatId) {
      return Response.json({ ok: false, error: "Invalid phone number" }, { status: 400 })
    }

    const baseUrl = getOpenWaUrl()
    const apiKey = getOpenWaApiKey()
    const sessionId = getOpenWaSessionId()
    const endpoint = previewOnly ? "preview-event" : "send-event"

    const res = await fetch(`${baseUrl}/sessions/${sessionId}/notification-engine/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ eventType, chatId, payload: payload || {} }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return Response.json({ ok: false, error: json?.error || json?.message || `${res.status} ${res.statusText}` }, { status: res.status })
    }

    return Response.json(json)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ ok: false, error: `Simulate proxy failed: ${msg}` }, { status: 502 })
  }
}
