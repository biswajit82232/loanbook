import type { Borrower, Loan } from '../data/types'
import {
  formatCurrency,
  formatDaysLent,
  formatRate,
  getBuiltUpInterest,
  getInterestAccrualDays,
  getLoanLentDays,
  getLoanTotalDue,
} from '../data/helpers'
import { normalizePhoneDigits } from './phone'

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const normalized = normalizePhoneDigits(phone)
  if (!normalized) return null
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

export function openWhatsApp(phone: string, message: string): boolean {
  const url = buildWhatsAppUrl(phone, message)
  if (!url) return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

export function buildLoanReminderMessage(
  borrower: Borrower,
  loan: Loan,
  businessName: string,
): string {
  const interest = getBuiltUpInterest(loan)
  const total = getLoanTotalDue(loan)
  const days = getInterestAccrualDays(loan)
  const lentDays = formatDaysLent(getLoanLentDays(loan), loan)

  const lines = [
    `Hello ${borrower.name},`,
    '',
    `Reminder from ${businessName}:`,
    '',
    `Loan ${loan.id}${loan.purpose ? ` — ${loan.purpose}` : ''}`,
    `Principal outstanding: ${formatCurrency(loan.principalOutstanding)}`,
    `Interest due: ${formatCurrency(interest)}`,
    `Total due: ${formatCurrency(total)}`,
    `Rate: ${formatRate(loan)}`,
  ]

  if (days > 0) lines.push(`Interest period: ${days} day${days === 1 ? '' : 's'} since last payment`)
  if (lentDays !== '—') lines.push(`Loan age: ${lentDays}`)

  lines.push('', 'Please arrange payment at your earliest convenience. Thank you.')
  return lines.join('\n')
}

export function buildBorrowerReminderMessage(
  borrower: Borrower,
  loans: Loan[],
  businessName: string,
): string {
  const active = loans.filter((l) => l.status === 'Active')
  if (active.length === 0) {
    return `Hello ${borrower.name},\n\nThis is ${businessName}. Please contact us regarding your account.\n\nThank you.`
  }

  const lines = [
    `Hello ${borrower.name},`,
    '',
    `Reminder from ${businessName}:`,
    '',
  ]

  let grandTotal = 0
  for (const loan of active) {
    const interest = getBuiltUpInterest(loan)
    const total = getLoanTotalDue(loan)
    grandTotal += total
    lines.push(
      `• ${loan.id}${loan.purpose ? ` (${loan.purpose})` : ''}`,
      `  Principal: ${formatCurrency(loan.principalOutstanding)} | Interest: ${formatCurrency(interest)} | Total: ${formatCurrency(total)}`,
    )
  }

  lines.push('', `Combined total due: ${formatCurrency(grandTotal)}`)
  lines.push('', 'Please arrange payment at your earliest convenience. Thank you.')
  return lines.join('\n')
}
