import { getReminderPeriodDays } from './formatPrefs'
import type { Loan } from './types'
import { borrowerHasPhone } from '../utils/phone'

export { borrowerHasPhone }
import {
  getBuiltUpInterest,
  getInterestAccrualDays,
  getLoanTotalDue,
} from './helpers'
import {
  formatDueSummary,
  getLoanDueInfo,
  type LoanDueInfo,
} from './loan-due'

export interface MonthlyLoanReminder {
  loan: Loan
  borrowerId: string
  daysSinceAnchor: number
  monthPeriod: number
  interestDue: number
  totalDue: number
  dismissKey: string
  due: LoanDueInfo
  dueSummary: string
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

export function getDueSoonDismissKey(loanId: string, dueDateLabel: string): string {
  return `${loanId}:soon:${dueDateLabel}`
}

export function getMonthlyLoanReminders(
  loans: Loan[],
  dismissed: Set<string>,
  asOf: Date = new Date(),
  periodDays = getReminderPeriodDays(),
): MonthlyLoanReminder[] {
  return loans
    .filter((l) => l.status === 'Active')
    .map((loan) => {
      const due = getLoanDueInfo(loan, asOf, periodDays)
      const daysSinceAnchor = getInterestAccrualDays(loan, asOf)
      const monthPeriod = getMonthlyReminderPeriod(loan, asOf)

      if (due.status === 'due_soon' && monthPeriod < 1) {
        const dismissKey = getDueSoonDismissKey(loan.id, due.dueDateLabel)
        if (dismissed.has(dismissKey)) return null
        const interestDue = getBuiltUpInterest(loan, asOf)
        return {
          loan,
          borrowerId: loan.borrowerId,
          daysSinceAnchor,
          monthPeriod: 0,
          interestDue,
          totalDue: getLoanTotalDue(loan, asOf),
          dismissKey,
          due,
          dueSummary: formatDueSummary(due),
        }
      }

      if (monthPeriod < 1) return null

      const interestDue = getBuiltUpInterest(loan, asOf)
      if (interestDue <= 0 && due.status !== 'overdue') return null

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
        due,
        dueSummary: formatDueSummary(due),
      }
    })
    .filter((r): r is MonthlyLoanReminder => r !== null)
    .sort((a, b) => {
      const rank = (d: LoanDueInfo) =>
        d.status === 'overdue' ? 0 : d.status === 'due_soon' ? 1 : 2
      const ra = rank(a.due)
      const rb = rank(b.due)
      if (ra !== rb) return ra - rb
      const da = a.due.daysUntilDue ?? 999
      const db = b.due.daysUntilDue ?? 999
      if (da !== db) return da - db
      return b.daysSinceAnchor - a.daysSinceAnchor
    })
}

export function formatReminderPeriodLabel(reminder: MonthlyLoanReminder): string {
  if (reminder.dueSummary) return reminder.dueSummary
  const n = reminder.monthPeriod
  return n === 1 ? '1 period since last payment' : `${n} periods since last payment`
}

export function getAnchorLabel(loan: Loan): string {
  return loan.lastPaymentDate ? `Last payment: ${loan.lastPaymentDate}` : `Lent on: ${loan.startDate}`
}

export type DashboardAttentionKind = 'payment_due' | 'payment_due_soon' | 'pending_loan'

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
  dueDateLabel?: string
}

export function getDashboardAttentionItems(
  loans: Loan[],
  dismissed: Set<string>,
  getBorrowerName: (borrowerId: string) => string,
  asOf: Date = new Date(),
  periodDays = getReminderPeriodDays(),
): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = []

  for (const reminder of getMonthlyLoanReminders(loans, dismissed, asOf, periodDays)) {
    const name = getBorrowerName(reminder.borrowerId)
    const loan = reminder.loan
    const kind: DashboardAttentionKind =
      reminder.due.status === 'due_soon' && reminder.monthPeriod < 1
        ? 'payment_due_soon'
        : 'payment_due'
    items.push({
      id: `reminder-${reminder.dismissKey}`,
      kind,
      loanId: loan.id,
      borrowerId: reminder.borrowerId,
      borrowerName: name || 'Borrower',
      reason: formatReminderPeriodLabel(reminder),
      context: `${getAnchorLabel(loan)} · ${loan.id}`,
      amount: reminder.interestDue,
      amountCaption: reminder.monthPeriod < 1 ? 'Interest building' : 'Interest due',
      dismissKey: reminder.dismissKey,
      dueDateLabel: reminder.due.dueDateLabel,
    })
  }

  for (const loan of loans.filter((l) => l.status === 'Pending')) {
    const due = getLoanDueInfo(loan, asOf, periodDays)
    const name = getBorrowerName(loan.borrowerId)
    items.push({
      id: `pending-${loan.id}`,
      kind: 'pending_loan',
      loanId: loan.id,
      borrowerId: loan.borrowerId,
      borrowerName: name || 'Borrower',
      reason: formatDueSummary(due) || `Disbursement due ${due.dueDateLabel}`,
      context: `${loan.id} · ${loan.purpose || 'Pending'}`,
      amount: loan.principal,
      amountCaption: 'Principal',
      dueDateLabel: due.dueDateLabel,
    })
  }

  const kindOrder: Record<DashboardAttentionKind, number> = {
    payment_due: 0,
    payment_due_soon: 1,
    pending_loan: 2,
  }
  return items.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind])
}
