const CLEAN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function cleanBase32(num: number, length = 7): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result = CLEAN_ALPHABET[num % CLEAN_ALPHABET.length] + result
    num = Math.floor(num / CLEAN_ALPHABET.length)
  }
  return result
}

export function generatePaymentReference(billId: string): string {
  const clean = billId.replace(/[^a-f0-9]/gi, '')
  const hash = parseInt(clean.slice(-8), 16) || Math.abs(clean.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0))
  return cleanBase32(hash, 7)
}
