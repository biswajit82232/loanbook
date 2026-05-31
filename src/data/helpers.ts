import type {
  Borrower,
  BorrowerInterestAllocation,
  CreateBorrowerInput,
  CreateLoanInput,
  CreatePartnerInput,
  InterestEntry,
  InterestRatePeriod,
  Loan,
  LoanPartnerShare,
  Partner,
  Payment,
  PaymentType,
  UpdateBorrowerInput,
  UpdateLoanInput,
  UpdatePartnerInput,
} from './types'

import { getCurrencyCode, getCurrencyLocale } from './formatPrefs'

export function formatCurrency(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0
  const currency = getCurrencyCode()
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'INR' ? 0 : 2,
  }).format(value)
}

export function formatRate(loan: Loan): string {
  return formatRateTerms(loan.rate, loan.ratePeriod)
}

export function formatRateTerms(rate: number, ratePeriod: InterestRatePeriod): string {
  const unit = ratePeriod === 'monthly' ? 'p.m.' : 'p.a.'
  return `${rate}% ${unit}`
}

export function normalizePartner(
  partner: Partner & { email?: string; rate?: number; ratePeriod?: InterestRatePeriod },
): Partner {
  return {
    id: partner.id,
    name: partner.name,
    phone: partner.phone ?? '',
    startDate: partner.startDate,
    status: partner.status,
    notes: partner.notes ?? '',
  }
}

export function normalizeBorrower(
  borrower: Borrower & { email?: string; updatedAt?: string },
): Borrower {
  return {
    id: borrower.id,
    name: borrower.name,
    phone: borrower.phone ?? '',
    address: borrower.address ?? '—',
    joinedDate: borrower.joinedDate,
    updatedAt: borrower.updatedAt ?? borrower.joinedDate,
    notes: borrower.notes ?? '',
  }
}

export function compareBorrowerByLastEdited(a: Borrower, b: Borrower): number {
  const ta = parseAppDate(a.updatedAt)?.getTime() ?? 0
  const tb = parseAppDate(b.updatedAt)?.getTime() ?? 0
  if (tb !== ta) return tb - ta
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

export function compareLoanByStartDateNewest(a: Loan, b: Loan): number {
  const ta = parseAppDate(a.startDate)?.getTime() ?? 0
  const tb = parseAppDate(b.startDate)?.getTime() ?? 0
  if (tb !== ta) return tb - ta
  return b.id.localeCompare(a.id)
}

export function getPaymentTypeLabel(type: PaymentType): string {
  return type === 'interest_only' ? 'Interest only' : 'Full settlement'
}

export function parseAppDate(dateStr: string): Date | null {
  const trimmed = dateStr?.trim()
  if (!trimmed) return null

  // ISO / yyyy-mm-dd parses reliably
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const iso = new Date(trimmed)
    return Number.isNaN(iso.getTime()) ? null : iso
  }

  // Display format from formatDisplayDate: "15 Jan 2024"
  const displayMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/)
  if (displayMatch) {
    const [, day, monthStr, year] = displayMatch
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    }
    const month = months[monthStr.slice(0, 3).toLowerCase()]
    if (month !== undefined) {
      const parsed = new Date(Number(year), month, Number(day))
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function nextPaymentId(payments: Payment[]): string {
  const taken = new Set(payments.map((p) => p.id))
  let id: string
  do {
    id = `PY-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  } while (taken.has(id))
  return id
}

export function formatDisplayDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getLoanLentDays(loan: Loan, asOf: Date = new Date()): number | null {
  if (loan.status === 'Pending') return null

  const start = parseAppDate(loan.startDate)
  if (!start) return null

  let end = asOf
  if (loan.status === 'Closed' && loan.lastPaymentDate) {
    const closedOn = parseAppDate(loan.lastPaymentDate)
    if (closedOn) end = closedOn
  }

  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.max(0, Math.floor((endUtc - startUtc) / 86400000))
}

export function formatDaysLent(days: number | null, loan: Loan): string {
  if (loan.status === 'Pending' || days === null) return '—'
  if (days === 0) return '0 days'
  if (days === 1) return '1 day'
  return `${days} days`
}

/**
 * Calendar days since accrual anchor (last interest payment or lend date).
 * Running interest uses: outstanding principal × rate × (days ÷ 30 monthly, ÷ 365 yearly).
 */
export function getInterestAccrualDays(loan: Loan, asOf: Date = new Date()): number {
  if (loan.status !== 'Active') return 0
  const anchorStr = loan.lastPaymentDate ?? loan.startDate
  const anchor = parseAppDate(anchorStr)
  if (!anchor) return 0
  const anchorUtc = Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
  const asOfUtc = Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  return Math.max(0, Math.floor((asOfUtc - anchorUtc) / 86400000))
}

/** Interest from rate × days on outstanding principal since accrual anchor */
export function calculateBuiltUpInterest(loan: Loan, asOf: Date = new Date()): number {
  if (loan.status !== 'Active' || loan.principalOutstanding <= 0) return 0

  const days = getInterestAccrualDays(loan, asOf)
  if (days <= 0) return 0

  const rate = loan.rate / 100
  const interest =
    loan.ratePeriod === 'monthly'
      ? loan.principalOutstanding * rate * (days / 30)
      : loan.principalOutstanding * rate * (days / 365)

  return Math.round(interest)
}

export function sumOutstandingInterestLog(loan: Loan): number {
  return (loan.interestLog ?? [])
    .filter((e) => e.status === 'outstanding')
    .reduce((sum, e) => sum + e.amount, 0)
}

/** New interest since last payment / lend date */
export function getRunningAccrual(loan: Loan, asOf: Date = new Date()): number {
  return calculateBuiltUpInterest(loan, asOf)
}

/**
 * Booked interest (manual / partial-pay remainder) plus running accrual since anchor.
 * Outstanding log rows are collapsed into accruedInterest on normalize to avoid double-count.
 */
export function getBuiltUpInterest(loan: Loan, asOf: Date = new Date()): number {
  if (loan.status !== 'Active') return 0
  const booked = loan.accruedInterest ?? 0
  const running = getRunningAccrual(loan, asOf)
  return booked + running
}

/** Move legacy outstanding log balances into accruedInterest (paid rows kept for history). */
export function collapseOutstandingInterestLog(loan: Loan): Loan {
  const log = loan.interestLog ?? []
  const fromLog = sumOutstandingInterestLog({ ...loan, interestLog: log })
  const paidOnly = log.filter((e) => e.status === 'paid')
  if (fromLog <= 0) {
    return { ...loan, interestLog: paidOnly }
  }
  return {
    ...loan,
    accruedInterest: (loan.accruedInterest ?? 0) + fromLog,
    interestLog: paidOnly,
  }
}

export function getInterestLogForDisplay(loan: Loan, asOf: Date = new Date()): InterestEntry[] {
  const paidEntries = (loan.interestLog ?? []).filter((e) => e.status === 'paid')
  const booked = loan.accruedInterest ?? 0
  const running = getRunningAccrual(loan, asOf)
  const rows: InterestEntry[] = [...paidEntries]

  if (booked > 0) {
    rows.push({
      id: 'booked-balance',
      periodLabel: 'Outstanding balance',
      amount: booked,
      status: 'outstanding',
    })
  }

  if (running > 0) {
    const anchor = loan.lastPaymentDate ?? loan.startDate
    const days = getInterestAccrualDays(loan, asOf)
    rows.push({
      id: 'current-accrual',
      periodLabel: days > 0 ? `Since ${anchor} · ${days}d` : `Since ${anchor}`,
      amount: running,
      status: 'outstanding',
    })
  }

  return rows
}

export function isPaymentInMonth(payment: Payment, year: number, month: number): boolean {
  const d = parseAppDate(payment.date)
  if (!d) return false
  return d.getFullYear() === year && d.getMonth() === month
}

export interface MonthSummary {
  id: string
  title: string
  interestCollected: number
  principalRecovered: number
  totalCollected: number
  paymentCount: number
  fullSettlements: number
}

export function getMonthlySummaries(payments: Payment[]): MonthSummary[] {
  const map = new Map<string, Payment[]>()

  for (const p of payments) {
    const d = parseAppDate(p.date)
    if (!d) continue
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const list = map.get(key) ?? []
    list.push(p)
    map.set(key, list)
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, list]) => {
      const [y, m] = key.split('-').map(Number)
      const title = new Date(y, m, 1).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
      const interestCollected = list.reduce((s, p) => s + p.interestAmount, 0)
      const principalRecovered = list.reduce((s, p) => s + p.principalAmount, 0)
      return {
        id: key,
        title,
        interestCollected,
        principalRecovered,
        totalCollected: list.reduce((s, p) => s + p.amount, 0),
        paymentCount: list.length,
        fullSettlements: list.filter((p) => p.type === 'full_settlement').length,
      }
    })
}

export function getLoanTotalDue(loan: Loan, asOf: Date = new Date()): number {
  if (loan.status === 'Closed') return 0
  return loan.principalOutstanding + getBuiltUpInterest(loan, asOf)
}

/** Original principal lent — for loan lists (interest/due shown separately). */
export function getLoanListAmountLabel(loan: Loan): string {
  if (loan.status === 'Pending') return 'Pending'
  return formatCurrency(loan.principal ?? 0)
}

export function normalizeLoan(loan: Loan & { description?: string }): Loan {
  let normalized: Loan = {
    ...loan,
    principalOutstanding: loan.principalOutstanding ?? loan.principal ?? 0,
    accruedInterest: loan.accruedInterest ?? 0,
    interestCollected: loan.interestCollected ?? 0,
    interestLog: loan.interestLog ?? [],
    partnerShares: migratePartnerShares(loan),
    description: loan.description?.trim() ?? '',
  }
  if (normalized.status === 'Active') {
    normalized = collapseOutstandingInterestLog(normalized)
  }
  return normalized
}

export function applyInterestToLog(
  log: InterestEntry[],
  paidAmount: number,
  paidOn: string,
): InterestEntry[] {
  let remaining = paidAmount
  const next = log.map((entry) => {
    if (entry.status === 'paid' || remaining <= 0) return entry
    if (entry.amount <= remaining) {
      remaining -= entry.amount
      return { ...entry, status: 'paid' as const, paidOn }
    }
    return entry
  })

  if (remaining > 0) {
    const idx = next.findIndex((e) => e.status === 'outstanding')
    if (idx >= 0) {
      const entry = next[idx]
      next[idx] = {
        ...entry,
        amount: Math.max(0, entry.amount - remaining),
      }
    }
  }

  return pruneZeroOutstandingLog(next)
}

function pruneZeroOutstandingLog(log: InterestEntry[]): InterestEntry[] {
  return log.filter((e) => e.status !== 'outstanding' || e.amount > 0)
}

export function buildPaymentAmounts(
  loan: Loan,
  type: PaymentType,
  amount: number,
): { interestAmount: number; principalAmount: number; total: number } | { error: string } {
  if (loan.status !== 'Active') {
    return { error: 'Payments are only allowed on active loans.' }
  }

  const builtUp = getBuiltUpInterest(loan)

  if (type === 'full_settlement') {
    const total = getLoanTotalDue(loan)
    if (Math.abs(amount - total) > 1) {
      return {
        error: `Full settlement must be exactly ${formatCurrency(total)} (principal + interest).`,
      }
    }
    return {
      interestAmount: builtUp,
      principalAmount: loan.principalOutstanding,
      total,
    }
  }

  if (amount <= 0) {
    return { error: 'Enter an amount greater than zero.' }
  }
  if (amount > builtUp) {
    return {
      error: `Amount cannot exceed built-up interest (${formatCurrency(builtUp)}).`,
    }
  }

  return { interestAmount: amount, principalAmount: 0, total: amount }
}

export function applyPaymentToLoan(loan: Loan, payment: Payment): Loan {
  if (payment.type === 'full_settlement') {
    return {
      ...loan,
      principalOutstanding: 0,
      accruedInterest: 0,
      status: 'Closed',
      interestCollected: loan.interestCollected + payment.interestAmount,
      lastPaymentDate: payment.date,
      interestLog: (loan.interestLog ?? []).map((e) => ({
        ...e,
        status: 'paid' as const,
        paidOn: payment.date,
      })),
    }
  }

  const priorDue = getBuiltUpInterest(loan)
  const remainingDue = Math.max(0, priorDue - payment.interestAmount)
  const interestLog = pruneZeroOutstandingLog(
    applyInterestToLog(loan.interestLog ?? [], payment.interestAmount, payment.date).filter(
      (e) => e.status === 'paid',
    ),
  )

  return {
    ...loan,
    accruedInterest: remainingDue,
    interestCollected: loan.interestCollected + payment.interestAmount,
    // Always move anchor on interest payment so running accrual does not double-count prior days
    lastPaymentDate: payment.date,
    interestLog,
  }
}

export function reverseInterestFromLog(
  log: InterestEntry[],
  paidAmount: number,
  paidOn: string,
): InterestEntry[] {
  let remaining = paidAmount
  const next = log.map((entry) => ({ ...entry }))

  for (let i = next.length - 1; i >= 0 && remaining > 0; i--) {
    const entry = next[i]
    if (entry.status !== 'paid' || entry.paidOn !== paidOn) continue
    next[i] = { ...entry, status: 'outstanding', paidOn: undefined }
    remaining -= entry.amount
  }

  if (remaining > 0) {
    const idx = next.findIndex((e) => e.status === 'outstanding')
    if (idx >= 0) {
      next[idx] = { ...next[idx], amount: next[idx].amount + remaining }
    }
  }

  return pruneZeroOutstandingLog(next)
}

function comparePaymentChronological(a: Payment, b: Payment): number {
  const ta = parseAppDate(a.date)?.getTime() ?? 0
  const tb = parseAppDate(b.date)?.getTime() ?? 0
  if (ta !== tb) return ta - tb
  return a.id.localeCompare(b.id)
}

/** Reset loan to terms-only state, then replay payments in date order. */
export function buildLoanStateForPaymentReplay(loan: Loan): Loan {
  return {
    ...loan,
    principalOutstanding: loan.principal,
    accruedInterest: 0,
    interestCollected: 0,
    interestLog: [],
    lastPaymentDate: undefined,
    status: loan.status === 'Closed' ? 'Active' : loan.status,
  }
}

export function reversePaymentOnLoan(loan: Loan, payment: Payment): Loan {
  if (payment.type === 'full_settlement') {
    return {
      ...loan,
      principalOutstanding: loan.principalOutstanding + payment.principalAmount,
      accruedInterest: 0,
      status: 'Active',
      interestCollected: Math.max(0, loan.interestCollected - payment.interestAmount),
      lastPaymentDate: undefined,
      interestLog: (loan.interestLog ?? []).map((e) =>
        e.paidOn === payment.date
          ? { ...e, status: 'outstanding' as const, paidOn: undefined }
          : e,
      ),
    }
  }

  return {
    ...loan,
    interestCollected: Math.max(0, loan.interestCollected - payment.interestAmount),
    lastPaymentDate: undefined,
    interestLog: reverseInterestFromLog(
      loan.interestLog ?? [],
      payment.interestAmount,
      payment.date,
    ),
  }
}

/** Rebuild loan balances from principal/terms by replaying payments (e.g. after delete). */
export function recomputeLoanFromPayments(
  loan: Loan,
  paymentsToApply: Payment[],
): Loan {
  let state = normalizeLoan(buildLoanStateForPaymentReplay(loan))

  const applyOrder = [...paymentsToApply].sort(comparePaymentChronological)
  for (const p of applyOrder) {
    state = applyPaymentToLoan(state, p)
  }

  return normalizeLoan(state)
}

/** Align loan interest/principal with payment history (fixes legacy bad deletes). */
export function healLoanWithPayments(loan: Loan, loanPayments: Payment[]): Loan {
  if (loanPayments.length > 0) {
    return recomputeLoanFromPayments(loan, loanPayments)
  }
  const booked = loan.accruedInterest ?? 0
  const running = getRunningAccrual(loan)
  if (booked > 0 && running > 0 && Math.abs(booked - running) <= 1) {
    return normalizeLoan({
      ...loan,
      accruedInterest: 0,
      interestLog: (loan.interestLog ?? []).filter((e) => e.status === 'paid'),
    })
  }
  return normalizeLoan(loan)
}

export function healLoanBookData(data: {
  borrowers: Borrower[]
  loans: Loan[]
  payments: Payment[]
  partners: Partner[]
}): { borrowers: Borrower[]; loans: Loan[]; payments: Payment[]; partners: Partner[] } {
  const paymentsByLoan = new Map<string, Payment[]>()
  for (const p of data.payments) {
    const list = paymentsByLoan.get(p.loanId) ?? []
    list.push(p)
    paymentsByLoan.set(p.loanId, list)
  }
  return {
    ...data,
    loans: data.loans.map((loan) =>
      healLoanWithPayments(loan, paymentsByLoan.get(loan.id) ?? []),
    ),
  }
}

export function getBorrowerOutstanding(loans: Loan[], borrowerId: string): number {
  return loans
    .filter((l) => l.borrowerId === borrowerId && l.status === 'Active')
    .reduce((sum, l) => sum + getLoanTotalDue(l), 0)
}

export function getBorrowerPrincipalDue(loans: Loan[], borrowerId: string): number {
  return loans
    .filter((l) => l.borrowerId === borrowerId && l.status === 'Active')
    .reduce((sum, l) => sum + l.principalOutstanding, 0)
}

export function getBorrowerInterestDue(loans: Loan[], borrowerId: string): number {
  return loans
    .filter((l) => l.borrowerId === borrowerId && l.status === 'Active')
    .reduce((sum, l) => sum + getBuiltUpInterest(l), 0)
}

/** Anchor used to order interest payments (oldest unpaid accrual first). */
function loanInterestAnchorTime(loan: Loan): number {
  const anchor = loan.lastPaymentDate ?? loan.startDate
  return parseAppDate(anchor)?.getTime() ?? 0
}

export type PlanBorrowerInterestPaymentResult =
  | {
      ok: true
      allocations: BorrowerInterestAllocation[]
      totalDue: number
    }
  | { ok: false; error: string }

/**
 * Split a borrower interest payment across active loans (interest-only).
 * Waterfall: loans with the oldest payment anchor first, then by loan id.
 */
export function planBorrowerInterestPayment(
  loans: Loan[],
  borrowerId: string,
  amount: number,
): PlanBorrowerInterestPaymentResult {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Enter an amount greater than zero.' }
  }

  const active = loans.filter(
    (l) => l.borrowerId === borrowerId && l.status === 'Active',
  )
  if (active.length === 0) {
    return { ok: false, error: 'No active loans for this borrower.' }
  }

  const withDue = active
    .map((loan) => ({ loan, due: getBuiltUpInterest(loan) }))
    .filter((row) => row.due > 0)

  const totalDue = withDue.reduce((sum, row) => sum + row.due, 0)
  if (totalDue <= 0) {
    return { ok: false, error: 'No interest due on active loans.' }
  }

  if (amount > totalDue) {
    return {
      ok: false,
      error: `Amount cannot exceed total interest due (${formatCurrency(totalDue)}).`,
    }
  }

  const sorted = [...withDue].sort((a, b) => {
    const ta = loanInterestAnchorTime(a.loan)
    const tb = loanInterestAnchorTime(b.loan)
    if (ta !== tb) return ta - tb
    return a.loan.id.localeCompare(b.loan.id)
  })

  let remaining = amount
  const allocations: BorrowerInterestAllocation[] = []

  for (const { loan, due } of sorted) {
    if (remaining <= 0) break
    const pay = Math.min(remaining, due)
    if (pay > 0) {
      allocations.push({ loanId: loan.id, amount: pay })
      remaining -= pay
    }
  }

  if (allocations.length === 0) {
    return { ok: false, error: 'No interest could be allocated.' }
  }

  return { ok: true, allocations, totalDue }
}

export function getBorrowerLoanCounts(loans: Loan[], borrowerId: string) {
  const borrowerLoans = loans.filter((l) => l.borrowerId === borrowerId)
  const active = borrowerLoans.filter((l) => l.status === 'Active').length
  return { total: borrowerLoans.length, active }
}

export function getPortfolioStats(loans: Loan[], payments: Payment[]) {
  const active = loans.filter((l) => l.status === 'Active')
  const principalDue = active.reduce((s, l) => s + l.principalOutstanding, 0)
  const interestDue = active.reduce((s, l) => s + getBuiltUpInterest(l), 0)
  const now = new Date()
  const collectedMtd = payments
    .filter((p) => isPaymentInMonth(p, now.getFullYear(), now.getMonth()))
    .reduce((s, p) => s + p.amount, 0)

  return {
    activeLoans: active.length,
    principalDue,
    interestDue,
    totalDue: principalDue + interestDue,
    collectedMtd,
  }
}

export function nextLoanId(loans: Loan[]): string {
  const nums = loans.map((l) => {
    const m = l.id.match(/LN-(\d+)/)
    return m ? parseInt(m[1], 10) : 0
  })
  const max = nums.length ? Math.max(...nums) : 0
  return `LN-${String(max + 1).padStart(3, '0')}`
}

export function nextBorrowerId(borrowers: Borrower[]): string {
  const nums = borrowers.map((b) => {
    const m = b.id.match(/BR-(\d+)/)
    return m ? parseInt(m[1], 10) : 0
  })
  const max = nums.length ? Math.max(...nums) : 0
  return `BR-${String(max + 1).padStart(3, '0')}`
}

export function buildInitialInterestLog(
  amount: number,
  startDate: string,
): InterestEntry[] {
  if (amount <= 0) return []
  return [
    {
      id: `I-${Date.now()}`,
      periodLabel: `Since ${startDate}`,
      amount,
      status: 'outstanding',
    },
  ]
}

export function validateCreateLoan(
  input: CreateLoanInput,
  borrowerExists: boolean,
  partners: Partner[],
  loanPrincipal: number,
): string | null {
  if (!borrowerExists) return 'Select a valid borrower.'
  if (input.principal <= 0) return 'Principal must be greater than zero.'
  if (input.rate < 0) return 'Interest rate cannot be negative.'
  const accrued = input.initialAccruedInterest ?? 0
  if (accrued < 0) return 'Initial interest cannot be negative.'
  if (accrued > input.principal) {
    return 'Initial interest cannot exceed principal.'
  }
  const shareErr = validatePartnerShares(
    input.partnerShares ?? [],
    partners,
    loanPrincipal,
  )
  if (shareErr) return shareErr
  return null
}

export function validateUpdateLoan(
  loan: Loan,
  input: UpdateLoanInput,
  hasPayments: boolean,
  partners: Partner[],
): string | null {
  if (loan.status === 'Closed') {
    if (
      input.borrowerId !== undefined ||
      input.principal !== undefined ||
      input.accruedInterest !== undefined ||
      input.status !== undefined ||
      input.rate !== undefined ||
      input.ratePeriod !== undefined ||
      input.startDate !== undefined
    ) {
      return 'Closed loans can only have purpose and description updated.'
    }
    return null
  }

  if (input.principal !== undefined && input.principal <= 0) {
    return 'Principal must be greater than zero.'
  }
  if (input.rate !== undefined && input.rate < 0) {
    return 'Interest rate cannot be negative.'
  }
  if (input.accruedInterest !== undefined && input.accruedInterest < 0) {
    return 'Built-up interest cannot be negative.'
  }
  if (hasPayments && input.borrowerId !== undefined && input.borrowerId !== loan.borrowerId) {
    return 'Cannot change borrower after payments exist.'
  }
  if (hasPayments && input.principal !== undefined && input.principal !== loan.principal) {
    return 'Cannot change principal after payments exist.'
  }
  if (hasPayments && input.status === 'Pending') {
    return 'Cannot mark loan as pending after payments exist.'
  }
  if (hasPayments && input.rate !== undefined && input.rate !== loan.rate) {
    return 'Cannot change rate after payments exist.'
  }
  if (hasPayments && input.ratePeriod !== undefined && input.ratePeriod !== loan.ratePeriod) {
    return 'Cannot change rate period after payments exist.'
  }
  if (hasPayments && input.startDate !== undefined && input.startDate !== loan.startDate) {
    return 'Cannot change lend date after payments exist.'
  }
  if (hasPayments && input.accruedInterest !== undefined) {
    return 'Cannot edit interest manually after payments exist. Record a payment instead.'
  }
  if (input.partnerShares !== undefined) {
    const principal = input.principal ?? loan.principal
    const shareErr = validatePartnerShares(input.partnerShares, partners, principal)
    if (shareErr) return shareErr
  }
  return null
}

export function validateCreateBorrower(input: CreateBorrowerInput): string | null {
  if (!input.name.trim()) return 'Name is required.'
  return null
}

export function validateUpdateBorrower(input: UpdateBorrowerInput): string | null {
  if (input.name !== undefined && !input.name.trim()) return 'Name is required.'
  return null
}

export function nextPartnerId(partners: Partner[]): string {
  const nums = partners.map((p) => {
    const m = p.id.match(/PR-(\d+)/)
    return m ? parseInt(m[1], 10) : 0
  })
  const max = nums.length ? Math.max(...nums) : 0
  return `PR-${String(max + 1).padStart(3, '0')}`
}

export function normalizePartnerShare(
  raw: LoanPartnerShare & { sharePercent?: number },
  loanPrincipal = 0,
): LoanPartnerShare {
  const rate = Number(raw.rate)
  const parsedRate = Number.isFinite(rate) ? Math.max(0, rate) : 0
  const amountRaw = Number(raw.amount)
  if (Number.isFinite(amountRaw)) {
    return {
      partnerId: raw.partnerId,
      amount: Math.max(0, amountRaw),
      rate: parsedRate,
      ratePeriod: raw.ratePeriod === 'yearly' ? 'yearly' : 'monthly',
    }
  }
  const pct = Number(raw.sharePercent)
  const pctNum = Number.isFinite(pct) ? pct : 0
  return {
    partnerId: raw.partnerId,
    amount: loanPrincipal > 0 ? Math.round((loanPrincipal * pctNum) / 100) : 0,
    rate: parsedRate,
    ratePeriod: raw.ratePeriod === 'yearly' ? 'yearly' : 'monthly',
  }
}

/** Legacy sharePercent → amount + rate fields */
function migratePartnerShares(loan: Loan): LoanPartnerShare[] {
  const principal = loan.principal ?? 0
  return (loan.partnerShares ?? []).map((raw) =>
    normalizePartnerShare(raw as LoanPartnerShare & { sharePercent?: number }, principal),
  )
}

export function formatShareRate(share: LoanPartnerShare): string {
  return formatRateTerms(share.rate, share.ratePeriod)
}

export function getPartnerShareOnLoan(loan: Loan, partnerId: string): LoanPartnerShare | undefined {
  const share = (loan.partnerShares ?? []).find((s) => s.partnerId === partnerId)
  if (!share) return undefined
  return normalizePartnerShare(share, loan.principal ?? 0)
}

/** Outstanding principal attributed to this partner on the loan (capital deployed) */
export function getPartnerDeployedOnLoan(loan: Loan, share: LoanPartnerShare): number {
  const normalized = normalizePartnerShare(share, loan.principal ?? 0)
  if (normalized.amount <= 0 || loan.principal <= 0) return 0
  return Math.round(normalized.amount * (loan.principalOutstanding / loan.principal))
}

/** Principal base for partner interest: always full loan outstanding (rate is on total, not share) */
export function getPartnerInterestPrincipalBase(
  loan: Loan,
  share: LoanPartnerShare,
): number {
  if (loan.status !== 'Active') return 0
  const normalized = normalizePartnerShare(share, loan.principal ?? 0)
  if (normalized.rate <= 0) return 0
  return loan.principalOutstanding
}

function getRatedPartnerSharesOnLoan(loan: Loan): LoanPartnerShare[] {
  const principal = loan.principal ?? 0
  return (loan.partnerShares ?? [])
    .map((raw) =>
      normalizePartnerShare(raw as LoanPartnerShare & { sharePercent?: number }, principal),
    )
    .filter((s) => s.rate > 0)
}

/** Booked borrower interest (accruedInterest) split across partners by their rates on the loan */
export function getPartnerBookedInterestOnLoan(loan: Loan, share: LoanPartnerShare): number {
  const booked = loan.accruedInterest ?? 0
  if (booked <= 0 || loan.status !== 'Active') return 0

  const rated = getRatedPartnerSharesOnLoan(loan)
  if (!rated.length) return 0

  const normalized = normalizePartnerShare(share, loan.principal ?? 0)
  if (normalized.rate <= 0) return 0

  const totalRate = rated.reduce((s, sh) => s + sh.rate, 0)
  if (totalRate <= 0) return 0

  return Math.round(booked * (normalized.rate / totalRate))
}

/** Interest owed on this loan share at the rate set on the loan form */
export function calculatePartnerInterestOnLoan(
  loan: Loan,
  share: LoanPartnerShare,
  asOf: Date = new Date(),
): number {
  if (loan.status !== 'Active') return 0

  const normalized = normalizePartnerShare(share, loan.principal ?? 0)
  if (normalized.rate <= 0) return 0

  const booked = getPartnerBookedInterestOnLoan(loan, normalized)

  const principalBase = getPartnerInterestPrincipalBase(loan, normalized)
  if (principalBase <= 0) return booked

  const days = getInterestAccrualDays(loan, asOf)
  if (days <= 0) return booked

  const rate = normalized.rate / 100
  const running =
    normalized.ratePeriod === 'monthly'
      ? principalBase * rate * (days / 30)
      : principalBase * rate * (days / 365)

  return booked + Math.round(running)
}

export function getPartnerInterestDue(
  partnerId: string,
  loans: Loan[],
): number {
  return loans
    .filter((l) => l.status === 'Active')
    .reduce((sum, loan) => {
      const share = getPartnerShareOnLoan(loan, partnerId)
      if (!share) return sum
      return sum + calculatePartnerInterestOnLoan(loan, share)
    }, 0)
}

export function getPartnerPrincipalDeployed(partnerId: string, loans: Loan[]): number {
  return loans
    .filter((l) => l.status === 'Active')
    .reduce((sum, loan) => {
      const share = getPartnerShareOnLoan(loan, partnerId)
      if (!share) return sum
      return sum + getPartnerDeployedOnLoan(loan, share)
    }, 0)
}

export function getLoansForPartner(partnerId: string, loans: Loan[]): Loan[] {
  return loans.filter((l) =>
    (l.partnerShares ?? []).some((s) => s.partnerId === partnerId),
  )
}

export function getPartnerPortfolioStats(partners: Partner[], loans: Loan[]) {
  const active = partners.filter((p) => p.status === 'Active')
  const totalDeployed = active.reduce(
    (s, p) => s + getPartnerPrincipalDeployed(p.id, loans),
    0,
  )
  const totalInterestDue = partners.reduce(
    (s, p) => s + getPartnerInterestDue(p.id, loans),
    0,
  )
  return {
    totalDeployed,
    totalInterestDue,
  }
}

export function validatePartnerShares(
  shares: LoanPartnerShare[],
  partners: Partner[],
  loanPrincipal: number,
): string | null {
  if (shares.length === 0) return null

  const ids = new Set<string>()
  let totalAmount = 0

  for (const share of shares) {
    if (!share.partnerId) return 'Select a partner for each row.'
    if (!partners.some((p) => p.id === share.partnerId)) {
      return 'Invalid partner selected.'
    }
    if (ids.has(share.partnerId)) return 'Each partner can only appear once per loan.'
    ids.add(share.partnerId)

    if (!Number.isFinite(share.amount) || share.amount < 0) {
      return 'Partner amount cannot be negative.'
    }
    if (!Number.isFinite(share.rate) || share.rate < 0) {
      return 'Partner rate cannot be negative.'
    }
    totalAmount += share.amount
  }

  if (loanPrincipal > 0 && totalAmount > loanPrincipal) {
    return `Partner amounts total ${totalAmount} — cannot exceed loan principal ${loanPrincipal}.`
  }
  return null
}

export function validateCreatePartner(input: CreatePartnerInput): string | null {
  if (!input.name.trim()) return 'Name is required.'
  return null
}

export function validateUpdatePartner(input: UpdatePartnerInput): string | null {
  if (input.name !== undefined && !input.name.trim()) return 'Name is required.'
  return null
}
