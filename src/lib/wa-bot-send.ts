export type WaBotSendInput = {
  phones: string[]
  message: string
}

export type WaBotSendResponse = {
  ok: boolean
  sent?: number
  failed?: number
  results?: Array<{ ok: boolean; phone: string; error?: string }>
  error?: string
}

export async function sendViaWaBot(input: WaBotSendInput): Promise<WaBotSendResponse> {
  const res = await fetch('/api/whatsapp/send-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const json = (await res.json().catch(() => ({}))) as WaBotSendResponse
  if (!res.ok) {
    return { ok: false, error: json?.error || 'Failed to send' }
  }
  return json
}
