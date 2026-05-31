import { getReminderPeriodDays } from './formatPrefs'
import type { Loan } from './types'
import {
  formatDisplayDate,
  getBuiltUpInterest,
  getInterestAccrualDays,
  parseAppDate,
} from './helpers'

export type LoanDueStatus = 'none' | 'scheduled' | 'upcoming' | 'due_soon' | 'overdue'

export interface LoanDueInfo {
  dueDate: Date | null
  dueDateLabel: string
  daysUntilDue: number | null
  status: LoanDueStatus
  statusLabel: string
}

const DUE_SOON_DAYS = 7

export function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
}

function daysBetweenUtc(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((toUtc - fromUtc) / 86400000)
}

export function getLoanAccrualAnchor(loan: Loan): Date | null {
  if (loan.status === 'Closed') return null
  return parseAppDate(loan.lastPaymentDate ?? loan.startDate)
}

/** Next interest due date = last payment (or lend date) + reminder period. Pending loans use start date. */
export function getLoanInterestDueDate(
  loan: Loan,
  periodDays = getReminderPeriodDays(),
): Date | null {
  if (loan.status === 'Pending') {
    return parseAppDate(loan.startDate)
  }
  if (loan.status !== 'Active') return null
  const anchor = getLoanAccrualAnchor(loan)
  if (!anchor) return null
  return addCalendarDays(anchor, periodDays)
}

export function getLoanDueInfo(
  loan: Loan,
  asOf: Date = new Date(),
  periodDays = getReminderPeriodDays(),
): LoanDueInfo {
  const empty: LoanDueInfo = {
    dueDate: null,
    dueDateLabel: '—',
    daysUntilDue: null,
    status: 'none',
    statusLabel: '',
  }

  if (loan.status === 'Closed') return empty

  if (loan.status === 'Pending') {
    const dueDate = parseAppDate(loan.startDate)
    if (!dueDate) return empty
    const daysUntilDue = daysBetweenUtc(asOf, dueDate)
    const status: LoanDueStatus =
      daysUntilDue < 0 ? 'overdue' : daysUntilDue <= DUE_SOON_DAYS ? 'due_soon' : 'scheduled'
    return {
      dueDate,
      dueDateLabel: formatDisplayDate(dueDate),
      daysUntilDue,
      status,
      statusLabel: status === 'overdue' ? 'Overdue' : status === 'due_soon' ? 'Due soon' : 'Scheduled',
    }
  }

  const dueDate = getLoanInterestDueDate(loan, periodDays)
  if (!dueDate) return empty

  const daysUntilDue = daysBetweenUtc(asOf, dueDate)
  const interest = getBuiltUpInterest(loan, asOf)
  const accrualDays = getInterestAccrualDays(loan, asOf)

  let status: LoanDueStatus = 'upcoming'
  if (daysUntilDue < 0 || (accrualDays >= periodDays && interest > 0)) {
    status = 'overdue'
  } else if (daysUntilDue <= DUE_SOON_DAYS) {
    status = 'due_soon'
  }

  const statusLabel =
    status === 'overdue' ? 'Overdue' : status === 'due_soon' ? 'Due soon' : 'Upcoming'

  return {
    dueDate,
    dueDateLabel: formatDisplayDate(dueDate),
    daysUntilDue,
    status,
    statusLabel,
  }
}

export function formatDueSummary(info: LoanDueInfo): string {
  if (!info.dueDate || info.daysUntilDue === null) return ''

  if (info.status === 'overdue') {
    const overdueDays = Math.abs(info.daysUntilDue)
    if (overdueDays === 0) return `Due today (${info.dueDateLabel})`
    return `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue · ${info.dueDateLabel}`
  }
  if (info.daysUntilDue === 0) return 'Due today'
  if (info.daysUntilDue === 1) return `Due tomorrow · ${info.dueDateLabel}`
  if (info.daysUntilDue <= DUE_SOON_DAYS) {
    return `Due in ${info.daysUntilDue} day${info.daysUntilDue === 1 ? '' : 's'} · ${info.dueDateLabel}`
  }
  return `Due ${info.dueDateLabel}`
}

export function dueStatusBadgeClass(status: LoanDueStatus): string {
  switch (status) {
    case 'overdue':
      return 'due'
    case 'due_soon':
      return 'due-soon'
    case 'scheduled':
    case 'upcoming':
      return 'pending'
    default:
      return 'pending'
  }
}
