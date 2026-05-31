/** Digits suitable for tel: / wa.me (10-digit IN → 91 prefix). */
export function normalizePhoneDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length >= 11 && digits.length <= 15) return digits
  return null
}

export function hasCallablePhone(phone: string | undefined): boolean {
  return normalizePhoneDigits(phone?.trim() ?? '') !== null
}

export function borrowerHasPhone(borrower: { phone?: string } | undefined): boolean {
  return hasCallablePhone(borrower?.phone)
}

export function buildTelUrl(phone: string): string | null {
  const normalized = normalizePhoneDigits(phone)
  if (!normalized) return null
  return `tel:+${normalized}`
}

export function openPhoneCall(phone: string): boolean {
  const url = buildTelUrl(phone)
  if (!url) return false
  window.location.href = url
  return true
}

export function formatDisplayPhone(phone: string | undefined): string {
  const trimmed = phone?.trim() ?? ''
  return trimmed || 'No phone'
}
