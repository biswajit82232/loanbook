import { getReminderPeriodDays } from './formatPrefs'
import type { Loan } from './types'
import { borrowerHasPhone } from '../utils/phone'

export { borrowerHasPhone }
import {
  getBuiltUpInterest,
  getInterestAccrualDays,
  getLoanTotalDue,
} from './helpers'

export interface MonthlyLoanReminder {
  loan: Loan
  borrowerId: string
  daysSinceAnchor: number
  monthPeriod: number
  interestDue: number
  totalDue: number
  dismissKey: string
}

export function getMonthlyReminderPeriod(loan: Loan, asOf: Date = new Date()): number {
  const periodDays = getReminderPeriodDays()
  const days = getInterestAccrualDays(loan, asOf)
  if (days < periodDays) return -1
  return Math.floor(days / periodDays)
}

export function getMonthlyReminderDismissKey(loanId: string, period: number): string {
  return `${loanId}:p${period}`
}

export function getMonthlyLoanReminders(
  loans: Loan[],
  dismissed: Set<string>,
  asOf: Date = new Date(),
): MonthlyLoanReminder[] {
  return loans
    .filter((l) => l.status === 'Active')
    .map((loan) => {
      const daysSinceAnchor = getInterestAccrualDays(loan, asOf)
      const monthPeriod = getMonthlyReminderPeriod(loan, asOf)
      if (monthPeriod < 1) return null

      const interestDue = getBuiltUpInterest(loan, asOf)
      if (interestDue <= 0) return null

      const dismissKey = getMonthlyReminderDismissKey(loan.id, monthPeriod)
      if (dismissed.has(dismissKey)) return null

      return {
        loan,
        borrowerId: loan.borrowerId,
        daysSinceAnchor,
        monthPeriod,
        interestDue,
        totalDue: getLoanTotalDue(loan, asOf),
        dismissKey,
      }
    })
    .filter((r): r is MonthlyLoanReminder => r !== null)
    .sort((a, b) => b.daysSinceAnchor - a.daysSinceAnchor)
}

export function formatReminderPeriodLabel(reminder: MonthlyLoanReminder): string {
  const n = reminder.monthPeriod
  return n === 1 ? '1 month since last payment' : `${n} months since last payment`
}

export function getAnchorLabel(loan: Loan): string {
  return loan.lastPaymentDate ? `Last payment: ${loan.lastPaymentDate}` : `Lent on: ${loan.startDate}`
}

export type DashboardAttentionKind = 'payment_due' | 'pending_loan'

export interface DashboardAttentionItem {
  id: string
  kind: DashboardAttentionKind
  loanId: string
  borrowerId: string
  borrowerName: string
  reason: string
  context: string
  amount: number
  amountCaption: string
  dismissKey?: string
}

export function getDashboardAttentionItems(
  loans: Loan[],
  dismissed: Set<string>,
  getBorrowerName: (borrowerId: string) => string,
  asOf: Date = new Date(),
): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = []

  for (const reminder of getMonthlyLoanReminders(loans, dismissed, asOf)) {
    const name = getBorrowerName(reminder.borrowerId)
    const loan = reminder.loan
    const context = loan.lastPaymentDate
      ? `Last payment ${loan.lastPaymentDate}`
      : `Disbursed ${loan.startDate}`
    items.push({
      id: `reminder-${reminder.dismissKey}`,
      kind: 'payment_due',
      loanId: loan.id,
      borrowerId: reminder.borrowerId,
      borrowerName: name || 'Borrower',
      reason: formatReminderPeriodLabel(reminder),
      context: `${context} · ${loan.id}`,
      amount: reminder.interestDue,
      amountCaption: 'Interest due',
      dismissKey: reminder.dismissKey,
    })
  }

  for (const loan of loans.filter((l) => l.status === 'Pending')) {
    const name = getBorrowerName(loan.borrowerId)
    items.push({
      id: `pending-${loan.id}`,
      kind: 'pending_loan',
      loanId: loan.id,
      borrowerId: loan.borrowerId,
      borrowerName: name || 'Borrower',
      reason: 'Awaiting disbursement',
      context: `${loan.id} · Scheduled ${loan.startDate}`,
      amount: loan.principal,
      amountCaption: 'Principal',
    })
  }

  const kindOrder: Record<DashboardAttentionKind, number> = {
    payment_due: 0,
    pending_loan: 1,
  }
  return items.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind])
}
