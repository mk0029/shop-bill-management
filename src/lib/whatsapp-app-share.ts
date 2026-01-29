export type WhatsAppShareInput = {
  text: string
  phone?: string | null
}

type ShareResult = {
  ok: boolean
  method?: 'web_share' | 'whatsapp_deeplink' | 'wa_me'
}

function normalizeWhatsAppPhone(phone?: string | null): string {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  return digits
}

export async function shareToWhatsAppApp(input: WhatsAppShareInput): Promise<ShareResult> {
  const text = String(input?.text || '').trim()
  if (!text) return { ok: false }

  try {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      await (navigator as any).share({ text })
      return { ok: true, method: 'web_share' }
    }
  } catch {
  }

  if (typeof window === 'undefined') return { ok: false }

  const phone = normalizeWhatsAppPhone(input.phone)
  const encoded = encodeURIComponent(text)
  const deepLink = phone
    ? `whatsapp://send?phone=${phone}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`

  try {
    window.location.href = deepLink
    return { ok: true, method: 'whatsapp_deeplink' }
  } catch {
  }

  try {
    const base = phone ? `https://wa.me/${phone}` : `https://wa.me/`
    window.open(`${base}?text=${encoded}`, '_blank')
    return { ok: true, method: 'wa_me' }
  } catch {
    return { ok: false }
  }
}
