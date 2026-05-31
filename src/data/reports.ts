import type { Loan, Payment, PaymentMode, PaymentType } from './types'
import {
  getBuiltUpInterest,
  isPaymentInMonth,
  parseAppDate,
  recomputeLoanFromPayments,
  type MonthSummary,
} from './helpers'

export interface ReportChartSlice {
  id: string
  label: string
  value: number
  color: string
}

export interface MonthReport extends MonthSummary {
  year: number
  month: number
  payments: Payment[]
  uniqueBorrowers: number
  averagePayment: number
  interestSharePct: number
  principalSharePct: number
  /** Interest collected vs interest due at start of month (active / paying loans). */
  collectionRate: number | null
  interestDueAtMonthStart: number
  byMode: ReportChartSlice[]
  byType: ReportChartSlice[]
  topBorrowers: { borrowerId: string; amount: number; paymentCount: number }[]
}

const MODE_COLORS: Record<PaymentMode, string> = {
  UPI: '#38bdf8',
  Cash: '#34d399',
  Bank: '#a78bfa',
  Cheque: '#fbbf24',
}

const TYPE_COLORS: Record<PaymentType, string> = {
  interest_only: 'var(--interest)',
  full_settlement: 'var(--success)',
}

export function parseMonthKey(id: string): { year: number; month: number } | null {
  const match = id.match(/^(\d+)-(\d+)$/)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) }
}

/** Same id format as `getMonthlySummaries` (`year-month`, month 0-based). */
export function getCurrentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth()}`
}

export function emptyMonthSummary(id: string): MonthSummary {
  const parsed = parseMonthKey(id)
  const year = parsed?.year ?? new Date().getFullYear()
  const month = parsed?.month ?? new Date().getMonth()
  const title = new Date(year, month, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
  return {
    id,
    title,
    interestCollected: 0,
    principalRecovered: 0,
    totalCollected: 0,
    paymentCount: 0,
    fullSettlements: 0,
  }
}

/** Ensures the calendar month appears in the list (zeros if no payments yet). */
export function withCurrentMonthSummary(summaries: MonthSummary[]): MonthSummary[] {
  if (summaries.length === 0) return summaries
  const currentKey = getCurrentMonthKey()
  if (summaries.some((s) => s.id === currentKey)) return summaries
  return [emptyMonthSummary(currentKey), ...summaries].sort((a, b) => b.id.localeCompare(a.id))
}

export function resolveActiveReportMonthId(
  summaries: MonthSummary[],
  pickedMonthId: string | null,
): string | null {
  if (summaries.length === 0) return null
  const ids = new Set(summaries.map((s) => s.id))
  const currentKey = getCurrentMonthKey()
  if (pickedMonthId && ids.has(pickedMonthId)) return pickedMonthId
  if (ids.has(currentKey)) return currentKey
  return summaries[0]?.id ?? null
}

function monthStartDate(year: number, month: number): Date {
  return new Date(year, month, 1)
}

function paymentsBeforeDate(payments: Payment[], before: Date): Payment[] {
  const cutoff = before.getTime()
  return payments.filter((p) => {
    const d = parseAppDate(p.date)
    return d !== null && d.getTime() < cutoff
  })
}

/** Interest due at the start of a calendar month (replayed from payment history). */
export function getPortfolioInterestDueAt(
  loans: Loan[],
  payments: Payment[],
  asOf: Date,
): number {
  const prior = paymentsBeforeDate(payments, asOf)
  let total = 0

  for (const loan of loans) {
    try {
      if (loan.status === 'Closed') {
        const hadPrior = prior.some((p) => p.loanId === loan.id)
        if (!hadPrior) continue
      }
      const loanPrior = prior.filter((p) => p.loanId === loan.id)
      const state = recomputeLoanFromPayments(loan, loanPrior)
      if (state.status !== 'Active') continue
      total += getBuiltUpInterest(state, asOf)
    } catch {
      /* skip loans that fail replay */
    }
  }

  return Math.round(total)
}

export function buildMonthReport(
  loans: Loan[],
  payments: Payment[],
  summary: MonthSummary,
): MonthReport {
  const parsed = parseMonthKey(summary.id)
  const year = parsed?.year ?? new Date().getFullYear()
  const month = parsed?.month ?? new Date().getMonth()

  const monthPayments = payments.filter((p) => isPaymentInMonth(p, year, month))
  const start = monthStartDate(year, month)

  const loanIdsInMonth = new Set(monthPayments.map((p) => p.loanId))
  const relevantLoans = loans.filter(
    (l) => l.status === 'Active' || l.status === 'Pending' || loanIdsInMonth.has(l.id),
  )

  const interestDueAtMonthStart = getPortfolioInterestDueAt(relevantLoans, payments, start)

  let collectionRate: number | null = null
  if (interestDueAtMonthStart > 0) {
    collectionRate = Math.min(
      100,
      Math.round((summary.interestCollected / interestDueAtMonthStart) * 100),
    )
  } else if (summary.interestCollected > 0) {
    collectionRate = 100
  }

  const total = summary.totalCollected
  const interestSharePct =
    total > 0 ? Math.round((summary.interestCollected / total) * 100) : 0
  const principalSharePct =
    total > 0 ? Math.round((summary.principalRecovered / total) * 100) : 0

  const modeMap = new Map<PaymentMode, number>()
  const typeMap = new Map<PaymentType, number>()
  const borrowerMap = new Map<string, { amount: number; count: number }>()

  for (const p of monthPayments) {
    modeMap.set(p.mode, (modeMap.get(p.mode) ?? 0) + p.amount)
    typeMap.set(p.type, (typeMap.get(p.type) ?? 0) + p.amount)
    const row = borrowerMap.get(p.borrowerId) ?? { amount: 0, count: 0 }
    borrowerMap.set(p.borrowerId, {
      amount: row.amount + p.amount,
      count: row.count + 1,
    })
  }

  const byMode: ReportChartSlice[] = (['UPI', 'Cash', 'Bank', 'Cheque'] as PaymentMode[])
    .map((mode) => ({
      id: mode,
      label: mode,
      value: modeMap.get(mode) ?? 0,
      color: MODE_COLORS[mode],
    }))
    .filter((s) => s.value > 0)

  const byType: ReportChartSlice[] = (
    [
      { id: 'interest_only' as const, label: 'Interest' },
      { id: 'full_settlement' as const, label: 'Settlement' },
    ] as const
  )
    .map(({ id, label }) => ({
      id,
      label,
      value: typeMap.get(id) ?? 0,
      color: TYPE_COLORS[id],
    }))
    .filter((s) => s.value > 0)

  const topBorrowers = [...borrowerMap.entries()]
    .map(([borrowerId, row]) => ({
      borrowerId,
      amount: row.amount,
      paymentCount: row.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  return {
    ...summary,
    year,
    month,
    payments: monthPayments,
    uniqueBorrowers: borrowerMap.size,
    averagePayment:
      monthPayments.length > 0
        ? Math.round(summary.totalCollected / monthPayments.length)
        : 0,
    interestSharePct,
    principalSharePct,
    collectionRate,
    interestDueAtMonthStart,
    byMode,
    byType,
    topBorrowers,
  }
}

export function formatCollectionRate(rate: number | null): string {
  if (rate === null) return '—'
  return `${rate}%`
}
