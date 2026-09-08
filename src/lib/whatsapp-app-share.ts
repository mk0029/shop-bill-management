export type WhatsAppShareInput = {
  text: string
  phone?: string | null
}

export type ShareResult = {
  ok: boolean
  method?: 'wa_me'
}

function normalizeWhatsAppPhone(phone?: string | null): string {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  
  // If already has country code (11+ digits), use as-is
  if (digits.length >= 11) return digits
  
  // For 10-digit numbers, assume India (+91)
  if (digits.length === 10) return `91${digits}`
  
  return digits
}

export async function shareToWhatsAppApp(input: WhatsAppShareInput): Promise<ShareResult> {
  const text = String(input?.text || '').trim()
  if (!text) return { ok: false }

  if (typeof window === 'undefined') return { ok: false }

  const phone = normalizeWhatsAppPhone(input.phone)
  const encoded = encodeURIComponent(text)
  const base = phone ? `https://wa.me/${phone}` : `https://wa.me/`
  const url = `${base}?text=${encoded}`

  try {
    window.open(url, '_blank', 'noopener,noreferrer')
    return { ok: true, method: 'wa_me' }
  } catch {
    try {
      window.location.href = url
      return { ok: true, method: 'wa_me' }
    } catch {
      return { ok: false }
    }
  }
}
