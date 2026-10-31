const TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const TOKEN_LENGTH = 12

/** Pelanggan membuktikan kepemilikan order dengan 4 digit terakhir nomor WhatsApp. */
export function verifyTrackingPhone(phone: string, last4: string): boolean {
  if (!/^\d{4}$/.test(last4)) return false
  return phone.replace(/\D/g, '').endsWith(last4)
}

/** Token opaque untuk link lacak/QR; tidak memuat PII (TDD §9). */
export function createTrackingToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH))
  return Array.from(bytes, (b) => TOKEN_ALPHABET[b % TOKEN_ALPHABET.length]).join('')
}
