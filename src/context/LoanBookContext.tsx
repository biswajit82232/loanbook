import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppSettings,
  Borrower,
  CreateBorrowerInput,
  CreateLoanInput,
  CreatePartnerInput,
  Loan,
  LoanBookData,
  Partner,
  Payment,
  PaymentType,
  RecordPaymentInput,
  UpdateBorrowerInput,
  UpdateLoanInput,
  UpdatePartnerInput,
} from '../data/types'
import { seedBorrowers, seedLoans, seedPartners, seedPayments } from '../data/seed'
import {
  applyPaymentToLoan,
  buildInitialInterestLog,
  buildPaymentAmounts,
  healLoanBookData,
  recomputeLoanFromPayments,
  formatDisplayDate,
  getMonthlySummaries,
  normalizeBorrower,
  normalizeLoan,
  normalizePartner,
  nextBorrowerId,
  nextLoanId,
  type MonthSummary,
  validateCreateBorrower,
  validateCreateLoan,
  validateCreatePartner,
  validateUpdateBorrower,
  validateUpdateLoan,
  validateUpdatePartner,
  nextPartnerId,
} from '../data/helpers'
import { fetchLoanBook, syncLoanBook } from '../data/supabase-repo'
import {
  defaultSettings,
  loadSettings,
  normalizeSettings,
  saveSettings,
} from '../data/settings'
import { isSupabaseConfigured } from '../lib/env'
import { applyAppearance } from '../utils/appearance'
import { configureFormatPrefs } from '../data/formatPrefs'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'loanbook-data-v1'

interface LoanBookContextValue {
  borrowers: Borrower[]
  loans: Loan[]
  payments: Payment[]
  partners: Partner[]
  settings: AppSettings
  monthlySummaries: MonthSummary[]
  getBorrower: (id: string) => Borrower | undefined
  getPartner: (id: string) => Partner | undefined
  getLoan: (id: string) => Loan | undefined
  getPayment: (id: string) => Payment | undefined
  getMonthSummary: (id: string) => MonthSummary | undefined
  updateSettings: (settings: AppSettings) => void
  dismissReminder: (dismissKey: string) => void
  dataLoading: boolean
  dataReady: boolean
  getLoansByBorrower: (borrowerId: string) => Loan[]
  getPaymentsByLoan: (loanId: string) => Payment[]
  getPaymentsByBorrower: (borrowerId: string) => Payment[]
  recordPayment: (
    input: RecordPaymentInput,
  ) => { ok: true; paymentId: string } | { ok: false; error: string }
  deletePayment: (paymentId: string) => { ok: true } | { ok: false; error: string }
  deleteLoan: (loanId: string) => { ok: true } | { ok: false; error: string }
  deleteBorrower: (borrowerId: string) => { ok: true } | { ok: false; error: string }
  createLoan: (
    input: CreateLoanInput,
  ) => { ok: true; loanId: string } | { ok: false; error: string }
  updateLoan: (input: UpdateLoanInput) => { ok: true } | { ok: false; error: string }
  createBorrower: (
    input: CreateBorrowerInput,
  ) => { ok: true; borrowerId: string } | { ok: false; error: string }
  updateBorrower: (
    input: UpdateBorrowerInput,
  ) => { ok: true } | { ok: false; error: string }
  createPartner: (
    input: CreatePartnerInput,
  ) => { ok: true; partnerId: string } | { ok: false; error: string }
  updatePartner: (input: UpdatePartnerInput) => { ok: true } | { ok: false; error: string }
  toast: string | null
  clearToast: () => void
}

const LoanBookContext = createContext<LoanBookContextValue | null>(null)

function loadStoredData(): LoanBookData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as LoanBookData
    return { ...data, partners: data.partners ?? [] }
  } catch {
    return null
  }
}

function saveData(data: LoanBookData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export function LoanBookProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const useCloud = isSupabaseConfigured() && Boolean(user?.id)
  const userId = user?.id

  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [dataLoading, setDataLoading] = useState(useCloud)
  const [dataReady, setDataReady] = useState(!useCloud)

  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    applyAppearance(settings)
    configureFormatPrefs({
      currency: settings.currency,
      reminderPeriodDays: settings.reminderPeriodDays,
    })
  }, [settings])

  useEffect(() => {
    if (useCloud && userId) {
      let cancelled = false
      setDataLoading(true)
      setDataReady(false)

      fetchLoanBook(userId)
        .then(({ data, settings: loaded }) => {
          if (cancelled) return
          const healed = healLoanBookData(data)
          setBorrowers(healed.borrowers)
          setLoans(healed.loans)
          setPayments(healed.payments)
          setPartners(healed.partners)
          setSettings(loaded)
          const loansChanged = healed.loans.some((loan) => {
            const raw = data.loans.find((l) => l.id === loan.id)
            if (!raw) return true
            return (
              (raw.accruedInterest ?? 0) !== (loan.accruedInterest ?? 0) ||
              raw.principalOutstanding !== loan.principalOutstanding ||
              raw.lastPaymentDate !== loan.lastPaymentDate ||
              raw.status !== loan.status
            )
          })
          if (loansChanged) {
            void syncLoanBook(userId, healed, loaded)
          }
          setDataReady(true)
        })
        .catch((err: Error) => {
          if (!cancelled) setToast(err.message || 'Failed to load data')
        })
        .finally(() => {
          if (!cancelled) setDataLoading(false)
        })

      return () => {
        cancelled = true
      }
    }

    if (!useCloud) {
      const stored = loadStoredData()
      const book = healLoanBookData({
        borrowers: (stored?.borrowers ?? seedBorrowers).map(normalizeBorrower),
        loans: (stored?.loans ?? seedLoans).map(normalizeLoan),
        payments: stored?.payments ?? seedPayments,
        partners: (stored?.partners ?? seedPartners).map(normalizePartner),
      })
      setBorrowers(book.borrowers)
      setLoans(book.loans)
      setPayments(book.payments)
      setPartners(book.partners)
      setSettings(loadSettings())
      setDataReady(true)
      setDataLoading(false)
    }
  }, [useCloud, userId])

  const monthlySummaries = useMemo(
    () => getMonthlySummaries(payments),
    [payments],
  )

  const persist = useCallback(
    (next: LoanBookData) => {
      const payload = { ...next, partners: next.partners ?? [] }
      setBorrowers(payload.borrowers.map(normalizeBorrower))
      setLoans(payload.loans.map(normalizeLoan))
      setPayments(payload.payments)
      setPartners(payload.partners.map(normalizePartner))

      if (useCloud && userId) {
        void syncLoanBook(userId, payload, settingsRef.current).then(({ error }) => {
          if (error) setToast(`Save failed: ${error}`)
        })
      } else {
        saveData(payload)
      }
    },
    [useCloud, userId],
  )

  const getBorrower = useCallback(
    (id: string) => borrowers.find((b) => b.id === id),
    [borrowers],
  )
  const getLoan = useCallback((id: string) => loans.find((l) => l.id === id), [loans])
  const getPayment = useCallback(
    (id: string) => payments.find((p) => p.id === id),
    [payments],
  )
  const getPartner = useCallback(
    (id: string) => partners.find((p) => p.id === id),
    [partners],
  )
  const getMonthSummary = useCallback(
    (id: string) => monthlySummaries.find((m) => m.id === id),
    [monthlySummaries],
  )

  const updateSettings = useCallback(
    (next: AppSettings) => {
      const normalized = normalizeSettings(next)
      setSettings(normalized)
      settingsRef.current = normalized
      applyAppearance(normalized)
      configureFormatPrefs({
        currency: normalized.currency,
        reminderPeriodDays: normalized.reminderPeriodDays,
      })

      if (useCloud && userId) {
        void syncLoanBook(
          userId,
          { borrowers, loans, payments, partners },
          normalized,
        ).then(({ error }) => {
          if (error) setToast(`Save failed: ${error}`)
          else setToast('Settings saved')
        })
      } else {
        saveSettings(normalized)
        setToast('Settings saved')
      }
    },
    [useCloud, userId, borrowers, loans, payments, partners],
  )

  const dismissReminder = useCallback(
    (dismissKey: string) => {
      const keys = new Set(settingsRef.current.reminderDismissed)
      if (keys.has(dismissKey)) return
      keys.add(dismissKey)
      updateSettings({
        ...settingsRef.current,
        reminderDismissed: [...keys],
      })
    },
    [updateSettings],
  )
  const getLoansByBorrower = useCallback(
    (borrowerId: string) => loans.filter((l) => l.borrowerId === borrowerId),
    [loans],
  )
  const getPaymentsByLoan = useCallback(
    (loanId: string) =>
      [...payments]
        .filter((p) => p.loanId === loanId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [payments],
  )
  const getPaymentsByBorrower = useCallback(
    (borrowerId: string) =>
      [...payments]
        .filter((p) => p.borrowerId === borrowerId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [payments],
  )

  const clearToast = useCallback(() => setToast(null), [])

  const createLoan = useCallback(
    (input: CreateLoanInput): { ok: true; loanId: string } | { ok: false; error: string } => {
      const err = validateCreateLoan(
        input,
        !!getBorrower(input.borrowerId),
        partners,
        input.principal,
      )
      if (err) return { ok: false, error: err }

      const accrued = input.initialAccruedInterest ?? 0
      const isActive = input.status === 'Active'
      const loanId = nextLoanId(loans)
      const startDate = input.startDate || formatDisplayDate()

      const loan = normalizeLoan({
        id: loanId,
        borrowerId: input.borrowerId,
        principal: input.principal,
        principalOutstanding: input.principal,
        rate: input.rate,
        ratePeriod: input.ratePeriod,
        startDate,
        status: input.status,
        purpose: input.purpose.trim(),
        accruedInterest: isActive ? accrued : 0,
        interestCollected: 0,
        interestLog: [],
        partnerShares: input.partnerShares ?? [],
      })

      persist({ borrowers, loans: [loan, ...loans], payments, partners })
      setToast(
        isActive
          ? `Loan ${loanId} created — ${formatToastAmount(input.principal)} lent`
          : `Loan ${loanId} saved as pending disbursement`,
      )
      return { ok: true, loanId }
    },
    [borrowers, loans, payments, partners, persist, getBorrower],
  )

  const updateLoan = useCallback(
    (input: UpdateLoanInput): { ok: true } | { ok: false; error: string } => {
      const loan = loans.find((l) => l.id === input.loanId)
      if (!loan) return { ok: false, error: 'Loan not found.' }

      const hasPayments = payments.some((p) => p.loanId === loan.id)
      const err = validateUpdateLoan(loan, input, hasPayments, partners)
      if (err) return { ok: false, error: err }

      if (loan.status === 'Closed') {
        const updated: Loan = {
          ...loan,
          purpose: input.purpose?.trim() ?? loan.purpose,
        }
        persist({
          borrowers,
          loans: loans.map((l) => (l.id === loan.id ? updated : l)),
          payments,
          partners,
        })
        setToast(`Loan ${loan.id} updated`)
        return { ok: true }
      }

      const updated: Loan = { ...loan }

      if (input.borrowerId !== undefined) updated.borrowerId = input.borrowerId
      if (input.purpose !== undefined) updated.purpose = input.purpose.trim()
      if (input.rate !== undefined) updated.rate = input.rate
      if (input.ratePeriod !== undefined) updated.ratePeriod = input.ratePeriod
      if (input.startDate !== undefined) updated.startDate = input.startDate

      if (input.principal !== undefined) {
        updated.principal = input.principal
        if (!hasPayments || loan.status === 'Pending') {
          updated.principalOutstanding =
            updated.status === 'Active' ? input.principal : input.principal
        }
      }

      if (input.accruedInterest !== undefined) {
        updated.accruedInterest = input.accruedInterest
        const paid = (updated.interestLog ?? []).filter((e) => e.status === 'paid')
        if (input.accruedInterest === 0) {
          updated.interestLog = paid
        } else {
          updated.interestLog = [
            ...paid,
            ...buildInitialInterestLog(input.accruedInterest, updated.startDate),
          ]
        }
      }

      if (input.status === 'Active' && loan.status === 'Pending') {
        updated.status = 'Active'
        updated.principalOutstanding = updated.principal
        if (updated.accruedInterest > 0 && updated.interestLog.length === 0) {
          updated.interestLog = buildInitialInterestLog(
            updated.accruedInterest,
            updated.startDate,
          )
        }
      } else if (input.status === 'Pending' && loan.status === 'Active' && !hasPayments) {
        updated.status = 'Pending'
        updated.accruedInterest = 0
        updated.interestLog = []
      } else if (input.status !== undefined) {
        updated.status = input.status
      }

      if (input.partnerShares !== undefined) {
        updated.partnerShares = input.partnerShares
      }

      persist({
        borrowers,
        loans: loans.map((l) => (l.id === loan.id ? normalizeLoan(updated) : l)),
        payments,
        partners,
      })
      setToast(`Loan ${loan.id} updated`)
      return { ok: true }
    },
    [borrowers, loans, payments, partners, persist],
  )

  const createBorrower = useCallback(
    (
      input: CreateBorrowerInput,
    ): { ok: true; borrowerId: string } | { ok: false; error: string } => {
      const err = validateCreateBorrower(input)
      if (err) return { ok: false, error: err }

      const borrower: Borrower = {
        id: nextBorrowerId(borrowers),
        name: input.name.trim(),
        phone: input.phone?.trim() ?? '',
        address: input.address?.trim() || '—',
        joinedDate: formatDisplayDate(),
        notes: input.notes?.trim() || '',
      }

      persist({ borrowers: [borrower, ...borrowers], loans, payments, partners })
      setToast(`Borrower ${borrower.name} added`)
      return { ok: true, borrowerId: borrower.id }
    },
    [borrowers, loans, payments, partners, persist],
  )

  const updateBorrower = useCallback(
    (input: UpdateBorrowerInput): { ok: true } | { ok: false; error: string } => {
      const borrower = borrowers.find((b) => b.id === input.borrowerId)
      if (!borrower) return { ok: false, error: 'Borrower not found.' }

      const err = validateUpdateBorrower(input)
      if (err) return { ok: false, error: err }

      const updated: Borrower = {
        ...borrower,
        name: input.name?.trim() ?? borrower.name,
        phone: input.phone !== undefined ? input.phone.trim() : borrower.phone,
        address:
          input.address !== undefined
            ? input.address.trim() || '—'
            : borrower.address,
        notes: input.notes?.trim() ?? borrower.notes,
      }

      persist({
        borrowers: borrowers.map((b) => (b.id === borrower.id ? updated : b)),
        loans,
        payments,
        partners,
      })
      setToast(`${updated.name} updated`)
      return { ok: true }
    },
    [borrowers, loans, payments, partners, persist],
  )

  const createPartner = useCallback(
    (
      input: CreatePartnerInput,
    ): { ok: true; partnerId: string } | { ok: false; error: string } => {
      const err = validateCreatePartner(input)
      if (err) return { ok: false, error: err }

      const partner: Partner = {
        id: nextPartnerId(partners),
        name: input.name.trim(),
        phone: input.phone?.trim() ?? '',
        startDate: input.startDate || formatDisplayDate(),
        status: input.status,
        notes: input.notes?.trim() || '',
      }

      persist({ borrowers, loans, payments, partners: [partner, ...partners] })
      setToast(`Partner ${partner.name} added`)
      return { ok: true, partnerId: partner.id }
    },
    [borrowers, loans, payments, partners, persist],
  )

  const updatePartner = useCallback(
    (input: UpdatePartnerInput): { ok: true } | { ok: false; error: string } => {
      const partner = partners.find((p) => p.id === input.partnerId)
      if (!partner) return { ok: false, error: 'Partner not found.' }

      const err = validateUpdatePartner(input)
      if (err) return { ok: false, error: err }

      const updated: Partner = {
        ...partner,
        name: input.name?.trim() ?? partner.name,
        phone: input.phone !== undefined ? input.phone.trim() : partner.phone,
        startDate: input.startDate ?? partner.startDate,
        status: input.status ?? partner.status,
        notes: input.notes?.trim() ?? partner.notes,
      }

      persist({
        borrowers,
        loans,
        payments,
        partners: partners.map((p) => (p.id === partner.id ? updated : p)),
      })
      setToast(`${updated.name} updated`)
      return { ok: true }
    },
    [borrowers, loans, payments, partners, persist],
  )

  const recordPayment = useCallback(
    (input: RecordPaymentInput): { ok: true; paymentId: string } | { ok: false; error: string } => {
      const loan = loans.find((l) => l.id === input.loanId)
      if (!loan) return { ok: false, error: 'Loan not found.' }

      const amounts = buildPaymentAmounts(loan, input.type, input.amount)
      if ('error' in amounts) return { ok: false, error: amounts.error }

      const paymentId = `PY-${Date.now()}`
      const payment: Payment = {
        id: paymentId,
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        date: input.date || formatDisplayDate(),
        amount: amounts.total,
        type: input.type,
        interestAmount: amounts.interestAmount,
        principalAmount: amounts.principalAmount,
        mode: input.mode,
        reference: input.reference?.trim() || '—',
        notes: input.notes?.trim() || getDefaultPaymentNote(input.type),
      }

      const updatedLoan = normalizeLoan(applyPaymentToLoan(loan, payment))
      persist({
        borrowers,
        loans: loans.map((l) => (l.id === loan.id ? updatedLoan : l)),
        payments: [payment, ...payments],
        partners,
      })
      setToast(
        input.type === 'full_settlement'
          ? `Loan ${loan.id} closed — ${formatToastAmount(payment.amount)} received`
          : `Interest payment recorded — ${formatToastAmount(payment.amount)}`,
      )
      return { ok: true, paymentId }
    },
    [borrowers, loans, payments, partners, persist],
  )

  const deletePayment = useCallback(
    (paymentId: string): { ok: true } | { ok: false; error: string } => {
      const payment = payments.find((p) => p.id === paymentId)
      if (!payment) return { ok: false, error: 'Payment not found.' }

      const loan = loans.find((l) => l.id === payment.loanId)
      if (!loan) return { ok: false, error: 'Loan not found.' }

      const allForLoan = payments.filter((p) => p.loanId === loan.id)
      const remaining = allForLoan.filter((p) => p.id !== paymentId)
      const updatedLoan = recomputeLoanFromPayments(loan, remaining)

      persist({
        borrowers,
        loans: loans.map((l) => (l.id === loan.id ? updatedLoan : l)),
        payments: payments.filter((p) => p.id !== paymentId),
        partners,
      })
      setToast(`Payment ${paymentId} deleted`)
      return { ok: true }
    },
    [borrowers, loans, payments, partners, persist],
  )

  const deleteLoan = useCallback(
    (loanId: string): { ok: true } | { ok: false; error: string } => {
      const loan = loans.find((l) => l.id === loanId)
      if (!loan) return { ok: false, error: 'Loan not found.' }

      const removedPayments = payments.filter((p) => p.loanId === loanId).length
      persist({
        borrowers,
        loans: loans.filter((l) => l.id !== loanId),
        payments: payments.filter((p) => p.loanId !== loanId),
        partners,
      })
      setToast(
        removedPayments > 0
          ? `Loan ${loanId} and ${removedPayments} payment${removedPayments === 1 ? '' : 's'} deleted`
          : `Loan ${loanId} deleted`,
      )
      return { ok: true }
    },
    [borrowers, loans, payments, partners, persist],
  )

  const deleteBorrower = useCallback(
    (borrowerId: string): { ok: true } | { ok: false; error: string } => {
      const borrower = borrowers.find((b) => b.id === borrowerId)
      if (!borrower) return { ok: false, error: 'Borrower not found.' }

      const removedLoans = loans.filter((l) => l.borrowerId === borrowerId).length
      const removedPayments = payments.filter((p) => p.borrowerId === borrowerId).length
      persist({
        borrowers: borrowers.filter((b) => b.id !== borrowerId),
        loans: loans.filter((l) => l.borrowerId !== borrowerId),
        payments: payments.filter((p) => p.borrowerId !== borrowerId),
        partners,
      })
      const parts: string[] = [`${borrower.name} deleted`]
      if (removedLoans > 0) {
        parts.push(
          `${removedLoans} loan${removedLoans === 1 ? '' : 's'}`,
        )
      }
      if (removedPayments > 0) {
        parts.push(
          `${removedPayments} payment${removedPayments === 1 ? '' : 's'}`,
        )
      }
      setToast(parts.length > 1 ? `${parts[0]} — ${parts.slice(1).join(', ')}` : parts[0])
      return { ok: true }
    },
    [borrowers, loans, payments, partners, persist],
  )

  const value = useMemo(
    () => ({
      borrowers,
      loans,
      payments,
      partners,
      settings,
      monthlySummaries,
      getBorrower,
      getPartner,
      getLoan,
      getPayment,
      getMonthSummary,
      updateSettings,
      dismissReminder,
      dataLoading,
      dataReady,
      getLoansByBorrower,
      getPaymentsByLoan,
      getPaymentsByBorrower,
      recordPayment,
      deletePayment,
      deleteLoan,
      deleteBorrower,
      createLoan,
      updateLoan,
      createBorrower,
      updateBorrower,
      createPartner,
      updatePartner,
      toast,
      clearToast,
    }),
    [
      borrowers,
      loans,
      payments,
      partners,
      settings,
      monthlySummaries,
      getBorrower,
      getPartner,
      getLoan,
      getPayment,
      getMonthSummary,
      updateSettings,
      dismissReminder,
      dataLoading,
      dataReady,
      getLoansByBorrower,
      getPaymentsByLoan,
      getPaymentsByBorrower,
      recordPayment,
      deletePayment,
      deleteLoan,
      deleteBorrower,
      createLoan,
      updateLoan,
      createBorrower,
      updateBorrower,
      createPartner,
      updatePartner,
      toast,
      clearToast,
    ],
  )

  return (
    <LoanBookContext.Provider value={value}>{children}</LoanBookContext.Provider>
  )
}

function getDefaultPaymentNote(type: PaymentType): string {
  return type === 'interest_only'
    ? 'Interest payment — principal unchanged'
    : 'Full settlement — loan closed'
}

function formatToastAmount(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

export function useLoanBook() {
  const ctx = useContext(LoanBookContext)
  if (!ctx) throw new Error('useLoanBook must be used within LoanBookProvider')
  return ctx
}
