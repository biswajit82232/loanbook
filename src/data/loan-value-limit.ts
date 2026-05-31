import type { Loan } from './types'
import { formatCurrency, getLoanTotalDue } from './helpers'

/** Alert when total due reaches this fraction of value limit (e.g. 0.9 = 90%). */
export const VALUE_LIMIT_CLOSE_RATIO = 0.9

export interface LoanValueLimitAlert {
  loan: Loan
  borrowerId: string
  totalDue: number
  valueLimit: number
  /** 0–1+ (can exceed 1 when over limit) */
  ratio: number
  dismissKey: string
}

export function getValueLimitDismissKey(loanId: string): string {
  return `value-limit:${loanId}`
}

export function isValueLimitSet(loan: Loan): boolean {
  return (loan.valueLimit ?? 0) > 0
}

export function getLoanValueLimitAlert(
  loan: Loan,
  asOf: Date = new Date(),
): LoanValueLimitAlert | null {
  const valueLimit = loan.valueLimit ?? 0
  if (valueLimit <= 0 || loan.status !== 'Active') return null

  const totalDue = getLoanTotalDue(loan, asOf)
  const ratio = totalDue / valueLimit
  if (ratio < VALUE_LIMIT_CLOSE_RATIO) return null

  return {
    loan,
    borrowerId: loan.borrowerId,
    totalDue,
    valueLimit,
    ratio,
    dismissKey: getValueLimitDismissKey(loan.id),
  }
}

export function getValueLimitAlerts(
  loans: Loan[],
  dismissed: Set<string>,
  asOf: Date = new Date(),
): LoanValueLimitAlert[] {
  return loans
    .map((loan) => {
      const alert = getLoanValueLimitAlert(loan, asOf)
      if (!alert || dismissed.has(alert.dismissKey)) return null
      return alert
    })
    .filter((a): a is LoanValueLimitAlert => a !== null)
    .sort((a, b) => b.ratio - a.ratio)
}

export function formatValueLimitAlertLabel(alert: LoanValueLimitAlert): string {
  const pct = Math.round(alert.ratio * 100)
  if (alert.totalDue >= alert.valueLimit) {
    return `At limit — ${formatCurrency(alert.totalDue)} of ${formatCurrency(alert.valueLimit)} (${pct}%)`
  }
  return `Near limit — ${formatCurrency(alert.totalDue)} of ${formatCurrency(alert.valueLimit)} (${pct}%)`
}
