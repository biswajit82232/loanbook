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
