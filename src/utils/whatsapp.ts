import type { Borrower, Loan } from '../data/types'
import { formatCurrency, getBuiltUpInterest } from '../data/helpers'
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

function loanDetailsBlock(loan: Loan): string[] {
  const interest = getBuiltUpInterest(loan)
  return [
    `Principal: ${formatCurrency(loan.principal)}`,
    `Interest due: ${formatCurrency(interest)}`,
    `Loan date: ${loan.startDate}`,
  ]
}

function messageClosing(businessName: string): string[] {
  return [
    '',
    'Kindly arrange payment of the interest due at your earliest convenience.',
    '',
    'Thank you for your cooperation.',
    '',
    'Regards,',
    businessName,
  ]
}

export function buildLoanReminderMessage(
  borrower: Borrower,
  loan: Loan,
  businessName: string,
): string {
  const lines = [
    `Dear ${borrower.name},`,
    '',
    `Greetings from ${businessName}.`,
    '',
    'This is a courteous reminder regarding your loan account. Details are as follows:',
    '',
    ...loanDetailsBlock(loan),
    ...messageClosing(businessName),
  ]
  return lines.join('\n')
}

export function buildBorrowerReminderMessage(
  borrower: Borrower,
  loans: Loan[],
  businessName: string,
): string {
  const active = loans.filter((l) => l.status === 'Active')
  if (active.length === 0) {
    return [
      `Dear ${borrower.name},`,
      '',
      `Greetings from ${businessName}.`,
      '',
      'Please contact us at your convenience regarding your loan account.',
      '',
      'Thank you.',
      '',
      'Regards,',
      businessName,
    ].join('\n')
  }

  const lines = [
    `Dear ${borrower.name},`,
    '',
    `Greetings from ${businessName}.`,
    '',
    'This is a courteous reminder regarding your active loan account(s). Details are as follows:',
    '',
  ]

  let totalInterest = 0
  let totalPrincipal = 0

  active.forEach((loan, index) => {
    const interest = getBuiltUpInterest(loan)
    totalInterest += interest
    totalPrincipal += loan.principal
    if (index > 0) lines.push('')
    lines.push(`Loan ${index + 1}`)
    lines.push(...loanDetailsBlock(loan).map((line) => `  ${line}`))
  })

  if (active.length > 1) {
    lines.push(
      '',
      `Total principal (all loans): ${formatCurrency(totalPrincipal)}`,
      `Total interest due: ${formatCurrency(totalInterest)}`,
    )
  }

  lines.push(...messageClosing(businessName))
  return lines.join('\n')
}
