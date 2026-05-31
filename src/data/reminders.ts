import { getReminderPeriodDays } from './formatPrefs'
import type { Loan } from './types'
import { borrowerHasPhone } from '../utils/phone'

export { borrowerHasPhone }
import {
  formatCurrency,
  getBuiltUpInterest,
  getInterestAccrualDays,
  getLoanTotalDue,
} from './helpers'
import {
  formatDueSummary,
  getLoanDueInfo,
  type LoanDueInfo,
} from './loan-due'
import {
  formatValueLimitAlertLabel,
  getValueLimitAlerts,
  type LoanValueLimitAlert,
} from './loan-value-limit'

export type LoanReminderKind = 'interest' | 'value_limit'

export interface MonthlyLoanReminder {
  kind: LoanReminderKind
  loan: Loan
  borrowerId: string
  daysSinceAnchor: number
  monthPeriod: number
  interestDue: number
  totalDue: number
  dismissKey: string
  due: LoanDueInfo
  dueSummary: string
  /** Red styling for value limit alerts */
  isCritical: boolean
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

function valueLimitToReminder(alert: LoanValueLimitAlert): MonthlyLoanReminder {
  const due = getLoanDueInfo(alert.loan)
  return {
    kind: 'value_limit',
    loan: alert.loan,
    borrowerId: alert.borrowerId,
    daysSinceAnchor: 0,
    monthPeriod: 0,
    interestDue: alert.totalDue - alert.loan.principalOutstanding,
    totalDue: alert.totalDue,
    dismissKey: alert.dismissKey,
    due,
    dueSummary: formatValueLimitAlertLabel(alert),
    isCritical: true,
  }
}

export function getMonthlyLoanReminders(
  loans: Loan[],
  dismissed: Set<string>,
  asOf: Date = new Date(),
  periodDays = getReminderPeriodDays(),
): MonthlyLoanReminder[] {
  const interestReminders = loans
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
          kind: 'interest' satisfies LoanReminderKind,
          loan,
          borrowerId: loan.borrowerId,
          daysSinceAnchor,
          monthPeriod: 0,
          interestDue,
          totalDue: getLoanTotalDue(loan, asOf),
          dismissKey,
          due,
          dueSummary: formatDueSummary(due),
          isCritical: false,
        }
      }

      if (monthPeriod < 1) return null

      const interestDue = getBuiltUpInterest(loan, asOf)
      if (interestDue <= 0 && due.status !== 'overdue') return null

      const dismissKey = getMonthlyReminderDismissKey(loan.id, monthPeriod)
      if (dismissed.has(dismissKey)) return null

      return {
        kind: 'interest' satisfies LoanReminderKind,
        loan,
        borrowerId: loan.borrowerId,
        daysSinceAnchor,
        monthPeriod,
        interestDue,
        totalDue: getLoanTotalDue(loan, asOf),
        dismissKey,
        due,
        dueSummary: formatDueSummary(due),
        isCritical: false,
      }
    })
    .filter((r): r is MonthlyLoanReminder => r !== null)

  return interestReminders.sort((a, b) => {
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

/** Bell notifications: value-limit alerts first, then interest reminders. */
export function getLoanNotificationReminders(
  loans: Loan[],
  dismissed: Set<string>,
  asOf: Date = new Date(),
  periodDays = getReminderPeriodDays(),
): MonthlyLoanReminder[] {
  const valueAlerts = getValueLimitAlerts(loans, dismissed, asOf).map(valueLimitToReminder)
  const interest = getMonthlyLoanReminders(loans, dismissed, asOf, periodDays)
  return [...valueAlerts, ...interest]
}

export function formatReminderPeriodLabel(reminder: MonthlyLoanReminder): string {
  if (reminder.kind === 'value_limit') return reminder.dueSummary
  if (reminder.dueSummary) return reminder.dueSummary
  const n = reminder.monthPeriod
  return n === 1 ? '1 period since last payment' : `${n} periods since last payment`
}

export function getAnchorLabel(loan: Loan): string {
  return loan.lastPaymentDate ? `Last payment: ${loan.lastPaymentDate}` : `Lent on: ${loan.startDate}`
}

export type DashboardAttentionKind =
  | 'value_limit'
  | 'payment_due'
  | 'payment_due_soon'
  | 'pending_loan'

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
  isCritical?: boolean
}

export function getDashboardAttentionItems(
  loans: Loan[],
  dismissed: Set<string>,
  getBorrowerName: (borrowerId: string) => string,
  asOf: Date = new Date(),
  periodDays = getReminderPeriodDays(),
): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = []

  for (const alert of getValueLimitAlerts(loans, dismissed, asOf)) {
    const name = getBorrowerName(alert.borrowerId)
    const loan = alert.loan
    items.push({
      id: `value-limit-${alert.dismissKey}`,
      kind: 'value_limit',
      loanId: loan.id,
      borrowerId: alert.borrowerId,
      borrowerName: name || 'Borrower',
      reason: formatValueLimitAlertLabel(alert),
      context: `${loan.id} · limit ${formatCurrency(alert.valueLimit)}`,
      amount: alert.totalDue,
      amountCaption: 'Principal + interest',
      dismissKey: alert.dismissKey,
      isCritical: true,
    })
  }

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
      isCritical: false,
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
    value_limit: 0,
    payment_due: 1,
    payment_due_soon: 2,
    pending_loan: 3,
  }
  return items.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind])
}
