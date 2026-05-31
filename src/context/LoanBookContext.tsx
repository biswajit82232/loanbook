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
  RecordBorrowerInterestPaymentInput,
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
  compareLoanByStartDateNewest,
  formatCurrency,
  healLoanBookData,
  planBorrowerInterestPayment,
  recomputeLoanFromPayments,
  formatDisplayDate,
  getMonthlySummaries,
  normalizeBorrower,
  normalizeLoan,
  normalizePartner,
  nextBorrowerId,
  nextLoanId,
  nextPaymentId,
  parseAppDate,
  type MonthSummary,
  validateCreateBorrower,
  validateCreateLoan,
  validateCreatePartner,
  validateUpdateBorrower,
  validateUpdateLoan,
  validateUpdatePartner,
  nextPartnerId,
} from '../data/helpers'
import {
  formatSyncStatusLabel,
  LOCAL_BOOK_STORAGE_ID,
  loadLocalCache,
  loadSyncMeta,
  onLocalCacheWarning,
  peekLocalCache,
  saveLocalCache,
  saveLocalCacheNow,
  saveSyncMeta,
  type SyncStatus,
} from '../data/local-cache'
import type { LoadProgressUpdate } from '../data/load-progress'
import { clampLoadPercent } from '../data/load-progress'
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

const SYNC_DEBOUNCE_MS = 2000

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

export type ToastVariant = 'success' | 'error' | 'warning'
export type AppToast = { message: string; variant: ToastVariant }

function loansNeedHealPush(raw: LoanBookData, healed: LoanBookData): boolean {
  return healed.loans.some((loan) => {
    const source = raw.loans.find((l) => l.id === loan.id)
    if (!source) return true
    return (
      (source.accruedInterest ?? 0) !== (loan.accruedInterest ?? 0) ||
      source.principalOutstanding !== loan.principalOutstanding ||
      source.lastPaymentDate !== loan.lastPaymentDate ||
      source.status !== loan.status
    )
  })
}

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
  dismissAttention: (dismissKey: string) => void
  dataLoading: boolean
  dataReady: boolean
  loadProgress: LoadProgressUpdate
  syncStatus: SyncStatus
  syncStatusLabel: string
  syncPending: boolean
  retrySync: () => void
  getLoansByBorrower: (borrowerId: string) => Loan[]
  getPaymentsByLoan: (loanId: string) => Payment[]
  getPaymentsByBorrower: (borrowerId: string) => Payment[]
  recordPayment: (
    input: RecordPaymentInput,
  ) => { ok: true; paymentId: string } | { ok: false; error: string }
  recordBorrowerInterestPayment: (
    input: RecordBorrowerInterestPaymentInput,
  ) => { ok: true; paymentIds: string[] } | { ok: false; error: string }
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
  deletePartner: (partnerId: string) => { ok: true } | { ok: false; error: string }
  toast: AppToast | null
  showToast: (message: string, variant?: ToastVariant) => void
  clearToast: () => void
}

const LoanBookContext = createContext<LoanBookContextValue | null>(null)

export function LoanBookProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const useCloud = isSupabaseConfigured() && Boolean(user?.id)
  const userId = user?.id

  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [toast, setToast] = useState<AppToast | null>(null)
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataReady, setDataReady] = useState(false)
  const [loadProgress, setLoadProgress] = useState<LoadProgressUpdate>({
    percent: 0,
    label: 'Starting…',
  })
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncMeta, setSyncMeta] = useState(() => ({
    pendingChanges: false,
    lastSyncedAt: null as string | null,
    lastPullAt: null as string | null,
    lastError: null as string | null,
  }))

  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncInFlightRef = useRef(false)
  const syncQueuedRef = useRef(false)
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  useEffect(() => {
    applyAppearance(settings)
    configureFormatPrefs({
      currency: settings.currency,
      reminderPeriodDays: settings.reminderPeriodDays,
    })
  }, [settings])

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    setToast({ message, variant })
  }, [])

  useEffect(() => onLocalCacheWarning((message) => showToast(message, 'warning')), [showToast])

  const reportLoadProgress = useCallback((update: LoadProgressUpdate) => {
    setLoadProgress({
      percent: clampLoadPercent(update.percent),
      label: update.label,
    })
  }, [])

  const applyHealedBook = useCallback((book: LoanBookData, loadedSettings: AppSettings) => {
    const healed = healLoanBookData(book)
    setBorrowers(healed.borrowers)
    setLoans(healed.loans)
    setPayments(healed.payments)
    setPartners(healed.partners)
    setSettings(loadedSettings)
    settingsRef.current = loadedSettings
    saveSettings(loadedSettings)
    return healed
  }, [])

  const flushSync = useCallback(async () => {
    const uid = userIdRef.current
    if (!uid || !isSupabaseConfigured()) return

    if (syncInFlightRef.current) {
      syncQueuedRef.current = true
      return
    }

    const cache = peekLocalCache(uid)
    if (!cache) return

    if (!navigator.onLine) {
      const meta = saveSyncMeta(uid, { pendingChanges: true })
      setSyncMeta(meta)
      setSyncStatus('offline')
      return
    }

    syncInFlightRef.current = true
    setSyncStatus('syncing')

    const healed = healLoanBookData(cache.data)
    const settings = normalizeSettings(cache.settings)
    const { error } = await syncLoanBook(uid, healed, settings)

    syncInFlightRef.current = false

    if (error) {
      const meta = saveSyncMeta(uid, { pendingChanges: true, lastError: error })
      setSyncMeta(meta)
      setSyncStatus('error')
      setToast({ message: `Sync failed: ${error}`, variant: 'error' })
    } else {
      const meta = saveSyncMeta(uid, {
        pendingChanges: false,
        lastSyncedAt: new Date().toISOString(),
        lastError: null,
      })
      setSyncMeta(meta)
      setSyncStatus('synced')
      void saveLocalCacheNow(uid, healed, settings)
    }

    if (syncQueuedRef.current) {
      syncQueuedRef.current = false
      void flushSync()
    }
  }, [])

  const scheduleSync = useCallback(() => {
    const uid = userIdRef.current
    if (!uid || !isSupabaseConfigured()) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null
      void flushSync()
    }, SYNC_DEBOUNCE_MS)
  }, [flushSync])

  const retrySync = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }
    void flushSync()
  }, [flushSync])

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!useCloud || !userId) return

    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return
      const meta = loadSyncMeta(userId)
      if (meta.pendingChanges) void flushSync()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [useCloud, userId, flushSync])

  useEffect(() => {
    if (useCloud && userId) {
      let cancelled = false

      void (async () => {
        reportLoadProgress({ percent: 3, label: 'Checking this device…' })
        const cache = await loadLocalCache(userId)
        if (cancelled) return

        let meta = loadSyncMeta(userId)
        setSyncMeta(meta)

        const fetchBase = cache ? 28 : 8
        const fetchSpan = cache ? 62 : 82

        if (cache) {
          reportLoadProgress({ percent: 22, label: 'Loaded from this device' })
          applyHealedBook(cache.data, cache.settings)
          setDataReady(true)
          setDataLoading(false)
          if (isBrowserOffline()) {
            setSyncStatus('offline')
          } else {
            setSyncStatus(
              meta.pendingChanges ? 'idle' : meta.lastSyncedAt ? 'synced' : 'idle',
            )
          }
        } else {
          reportLoadProgress({ percent: 8, label: 'Connecting to cloud…' })
        }

        if (isBrowserOffline()) {
          if (cache) {
            reportLoadProgress({ percent: 100, label: 'Ready' })
          } else {
            showToast('You are offline and no saved copy was found on this device.', 'error')
            setSyncStatus('offline')
            setDataReady(true)
            setDataLoading(false)
          }
          return
        }

        try {
          const { data, settings: serverSettings } = await fetchLoanBook(userId, (step) => {
            if (cancelled) return
            reportLoadProgress({
              percent: fetchBase + Math.round((step.percent / 100) * fetchSpan),
              label: step.label,
            })
          })
          if (cancelled) return

          reportLoadProgress({
            percent: cache ? 93 : 96,
            label: 'Applying your data…',
          })

          const healedServer = healLoanBookData(data)
          meta = loadSyncMeta(userId)

          if (meta.pendingChanges) {
            const local = peekLocalCache(userId) ?? (await loadLocalCache(userId))
            if (!local) {
              applyHealedBook(healedServer, serverSettings)
              await saveLocalCacheNow(userId, healedServer, serverSettings)
              meta = saveSyncMeta(userId, {
                pendingChanges: false,
                lastPullAt: new Date().toISOString(),
                lastSyncedAt: new Date().toISOString(),
                lastError: null,
              })
              setSyncMeta(meta)
              setSyncStatus('synced')
            } else {
              const localHealed = healLoanBookData(local.data)
              const { error } = await syncLoanBook(
                userId,
                localHealed,
                normalizeSettings(local.settings),
              )
              if (cancelled) return
              if (error) {
                meta = saveSyncMeta(userId, { lastError: error, pendingChanges: true })
                setSyncMeta(meta)
                setSyncStatus('error')
                setToast({ message: `Sync failed: ${error}`, variant: 'error' })
              } else {
                applyHealedBook(localHealed, local.settings)
                meta = saveSyncMeta(userId, {
                  pendingChanges: false,
                  lastPullAt: new Date().toISOString(),
                  lastSyncedAt: new Date().toISOString(),
                  lastError: null,
                })
                setSyncMeta(meta)
                setSyncStatus('synced')
                await saveLocalCacheNow(userId, localHealed, local.settings)
              }
            }
          } else {
            applyHealedBook(healedServer, serverSettings)
            await saveLocalCacheNow(userId, healedServer, serverSettings)

            if (loansNeedHealPush(data, healedServer)) {
              const { error } = await syncLoanBook(userId, healedServer, serverSettings)
              if (cancelled) return
              if (error) {
                meta = saveSyncMeta(userId, { lastError: error, pendingChanges: true })
                setSyncMeta(meta)
                setSyncStatus('error')
                setToast({ message: `Heal sync failed: ${error}`, variant: 'error' })
              }
            }

            if (!cancelled) {
              meta = saveSyncMeta(userId, {
                pendingChanges: false,
                lastPullAt: new Date().toISOString(),
                lastSyncedAt: new Date().toISOString(),
                lastError: null,
              })
              setSyncMeta(meta)
              setSyncStatus('synced')
            }
          }

          if (!cancelled) {
            reportLoadProgress({ percent: 100, label: 'Ready' })
          }
        } catch (err) {
          if (cancelled) return
          if (cache) {
            setSyncStatus('offline')
            if (!isBrowserOffline()) {
              meta = saveSyncMeta(userId, { lastError: (err as Error).message })
              setSyncMeta(meta)
            }
          } else {
            showToast((err as Error).message || 'Failed to load data', 'error')
          }
        } finally {
          if (!cancelled) {
            setDataReady(true)
            setDataLoading(false)
          }
        }
      })()

      return () => {
        cancelled = true
      }
    }

    if (!useCloud) {
      let cancelled = false
      void (async () => {
        reportLoadProgress({ percent: 12, label: 'Reading saved data…' })
        await new Promise((r) => setTimeout(r, 0))
        if (cancelled) return

        const cached = await loadLocalCache(LOCAL_BOOK_STORAGE_ID)
        reportLoadProgress({ percent: 48, label: 'Loading loans & payments…' })
        await new Promise((r) => setTimeout(r, 0))
        if (cancelled) return

        const stored = cached?.data
        const book = healLoanBookData({
          borrowers: (stored?.borrowers ?? seedBorrowers).map(normalizeBorrower),
          loans: (stored?.loans ?? seedLoans).map(normalizeLoan),
          payments: stored?.payments ?? seedPayments,
          partners: (stored?.partners ?? seedPartners).map(normalizePartner),
        })
        const loadedSettings = cached?.settings ?? loadSettings()

        reportLoadProgress({ percent: 82, label: 'Preparing your book…' })
        setBorrowers(book.borrowers)
        setLoans(book.loans)
        setPayments(book.payments)
        setPartners(book.partners)
        setSettings(loadedSettings)
        settingsRef.current = loadedSettings
        saveSettings(loadedSettings)
        saveLocalCache(LOCAL_BOOK_STORAGE_ID, book, loadedSettings)
        reportLoadProgress({ percent: 100, label: 'Ready' })
        if (!cancelled) {
          setDataReady(true)
          setDataLoading(false)
        }
      })()

      return () => {
        cancelled = true
      }
    }
  }, [useCloud, userId, applyHealedBook, reportLoadProgress, showToast])

  const syncStatusLabel = useMemo(
    () => formatSyncStatusLabel(syncStatus, syncMeta),
    [syncStatus, syncMeta],
  )

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
        saveLocalCache(userId, payload, settingsRef.current)
        const meta = saveSyncMeta(userId, { pendingChanges: true, lastError: null })
        setSyncMeta(meta)
        if (isBrowserOffline()) {
          setSyncStatus('offline')
        } else {
          setSyncStatus('idle')
          scheduleSync()
        }
      } else {
        saveLocalCache(LOCAL_BOOK_STORAGE_ID, payload, settingsRef.current)
      }
    },
    [useCloud, userId, scheduleSync],
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
        saveLocalCache(userId, { borrowers, loans, payments, partners }, normalized)
        const meta = saveSyncMeta(userId, { pendingChanges: true, lastError: null })
        setSyncMeta(meta)
        if (isBrowserOffline()) {
          setSyncStatus('offline')
        } else {
          scheduleSync()
        }
        showToast('Settings saved')
      } else {
        saveSettings(normalized)
        showToast('Settings saved')
      }
    },
    [useCloud, userId, borrowers, loans, payments, partners, scheduleSync],
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

  const dismissAttention = useCallback(
    (dismissKey: string) => {
      const keys = new Set(settingsRef.current.attentionDismissed)
      if (keys.has(dismissKey)) return
      keys.add(dismissKey)
      updateSettings({
        ...settingsRef.current,
        attentionDismissed: [...keys],
      })
    },
    [updateSettings],
  )
  const getLoansByBorrower = useCallback(
    (borrowerId: string) =>
      loans
        .filter((l) => l.borrowerId === borrowerId)
        .sort(compareLoanByStartDateNewest),
    [loans],
  )
  const getPaymentsByLoan = useCallback(
    (loanId: string) =>
      [...payments]
        .filter((p) => p.loanId === loanId)
        .sort(
          (a, b) =>
            (parseAppDate(b.date)?.getTime() ?? 0) - (parseAppDate(a.date)?.getTime() ?? 0),
        ),
    [payments],
  )
  const getPaymentsByBorrower = useCallback(
    (borrowerId: string) =>
      [...payments]
        .filter((p) => p.borrowerId === borrowerId)
        .sort(
          (a, b) =>
            (parseAppDate(b.date)?.getTime() ?? 0) - (parseAppDate(a.date)?.getTime() ?? 0),
        ),
    [payments],
  )

  const clearToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (!useCloud || !userId) return

    const onOnline = () => {
      const meta = loadSyncMeta(userId)
      if (meta.pendingChanges) {
        setSyncStatus('idle')
        void flushSync()
      } else if (syncStatus === 'offline') {
        setSyncStatus(meta.lastSyncedAt ? 'synced' : 'idle')
      }
    }

    const onOffline = () => {
      setSyncStatus('offline')
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [useCloud, userId, flushSync, syncStatus])

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
        description: input.description?.trim() ?? '',
        accruedInterest: isActive ? accrued : 0,
        interestCollected: 0,
        interestLog: [],
        partnerShares: input.partnerShares ?? [],
        valueLimit: Math.max(0, input.valueLimit ?? 0),
      })

      persist({ borrowers, loans: [loan, ...loans], payments, partners })
      showToast(
        isActive
          ? `Loan ${loanId} created — ${formatCurrency(input.principal)} lent`
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
          description:
            input.description !== undefined
              ? input.description.trim()
              : loan.description,
          valueLimit:
            input.valueLimit !== undefined
              ? Math.max(0, input.valueLimit)
              : loan.valueLimit,
        }
        persist({
          borrowers,
          loans: loans.map((l) => (l.id === loan.id ? updated : l)),
          payments,
          partners,
        })
        showToast(`Loan ${loan.id} updated`)
        return { ok: true }
      }

      const updated: Loan = { ...loan }

      if (input.borrowerId !== undefined) updated.borrowerId = input.borrowerId
      if (input.purpose !== undefined) updated.purpose = input.purpose.trim()
      if (input.description !== undefined) updated.description = input.description.trim()
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
      if (input.valueLimit !== undefined) {
        updated.valueLimit = Math.max(0, input.valueLimit)
      }

      persist({
        borrowers,
        loans: loans.map((l) => (l.id === loan.id ? normalizeLoan(updated) : l)),
        payments,
        partners,
      })
      showToast(`Loan ${loan.id} updated`)
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

      const now = formatDisplayDate()
      const borrower: Borrower = {
        id: nextBorrowerId(borrowers),
        name: input.name.trim(),
        phone: input.phone?.trim() ?? '',
        address: input.address?.trim() || '—',
        joinedDate: now,
        updatedAt: now,
        notes: input.notes?.trim() || '',
      }

      persist({ borrowers: [borrower, ...borrowers], loans, payments, partners })
      showToast(`Borrower ${borrower.name} added`)
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
        updatedAt: formatDisplayDate(),
      }

      persist({
        borrowers: borrowers.map((b) => (b.id === borrower.id ? updated : b)),
        loans,
        payments,
        partners,
      })
      showToast(`${updated.name} updated`)
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
      showToast(`Partner ${partner.name} added`)
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
      showToast(`${updated.name} updated`)
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

      const paymentId = nextPaymentId(payments)
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
      showToast(
        input.type === 'full_settlement'
          ? `Loan ${loan.id} closed — ${formatCurrency(payment.amount)} received`
          : `Interest payment recorded — ${formatCurrency(payment.amount)}`,
      )
      return { ok: true, paymentId }
    },
    [borrowers, loans, payments, partners, persist],
  )

  const recordBorrowerInterestPayment = useCallback(
    (
      input: RecordBorrowerInterestPaymentInput,
    ): { ok: true; paymentIds: string[] } | { ok: false; error: string } => {
      const borrower = borrowers.find((b) => b.id === input.borrowerId)
      if (!borrower) return { ok: false, error: 'Borrower not found.' }

      const plan = planBorrowerInterestPayment(loans, input.borrowerId, input.amount)
      if (!plan.ok) return { ok: false, error: plan.error }

      const payDate = input.date || formatDisplayDate()
      const batchId = `BATCH-${Date.now()}`
      const sharedRef = input.reference?.trim() || '—'
      const noteBase =
        input.notes?.trim() ||
        `Borrower interest (${plan.allocations.length} loans) · ${batchId}`

      let nextLoans = loans
      const newPayments: Payment[] = []
      const knownIds = [...payments]

      for (let i = 0; i < plan.allocations.length; i++) {
        const { loanId, amount } = plan.allocations[i]
        const loan = nextLoans.find((l) => l.id === loanId)
        if (!loan) return { ok: false, error: `Loan ${loanId} not found.` }

        const amounts = buildPaymentAmounts(loan, 'interest_only', amount)
        if ('error' in amounts) return { ok: false, error: amounts.error }

        const payment: Payment = {
          id: nextPaymentId(knownIds),
          loanId: loan.id,
          borrowerId: loan.borrowerId,
          date: payDate,
          amount: amounts.total,
          type: 'interest_only',
          interestAmount: amounts.interestAmount,
          principalAmount: 0,
          mode: input.mode,
          reference: sharedRef,
          notes: noteBase,
        }

        newPayments.push(payment)
        knownIds.push(payment)
        nextLoans = nextLoans.map((l) =>
          l.id === loan.id ? normalizeLoan(applyPaymentToLoan(loan, payment)) : l,
        )
      }

      persist({
        borrowers,
        loans: nextLoans,
        payments: [...newPayments, ...payments],
        partners,
      })
      showToast(
        `Interest across ${newPayments.length} loan${newPayments.length === 1 ? '' : 's'} — ${formatCurrency(input.amount)}`,
      )
      return { ok: true, paymentIds: newPayments.map((p) => p.id) }
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
      showToast(`Payment ${paymentId} deleted`)
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
      showToast(
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
      showToast(parts.length > 1 ? `${parts[0]} — ${parts.slice(1).join(', ')}` : parts[0])
      return { ok: true }
    },
    [borrowers, loans, payments, partners, persist, showToast],
  )

  const deletePartner = useCallback(
    (partnerId: string): { ok: true } | { ok: false; error: string } => {
      const partner = partners.find((p) => p.id === partnerId)
      if (!partner) return { ok: false, error: 'Partner not found.' }

      const linkedLoans = loans.filter((l) =>
        (l.partnerShares ?? []).some((s) => s.partnerId === partnerId),
      )
      const cleanedLoans = loans.map((loan) => {
        const shares = (loan.partnerShares ?? []).filter((s) => s.partnerId !== partnerId)
        if (shares.length === (loan.partnerShares ?? []).length) return loan
        return normalizeLoan({ ...loan, partnerShares: shares })
      })

      persist({
        borrowers,
        loans: cleanedLoans,
        payments,
        partners: partners.filter((p) => p.id !== partnerId),
      })

      const parts: string[] = [`${partner.name} deleted`]
      if (linkedLoans.length > 0) {
        parts.push(
          `removed from ${linkedLoans.length} loan${linkedLoans.length === 1 ? '' : 's'}`,
        )
      }
      showToast(parts.length > 1 ? `${parts[0]} — ${parts.slice(1).join(', ')}` : parts[0])
      return { ok: true }
    },
    [borrowers, loans, payments, partners, persist, showToast],
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
      dismissAttention,
      dataLoading,
      dataReady,
      loadProgress,
      syncStatus,
      syncStatusLabel,
      syncPending: syncMeta.pendingChanges,
      retrySync,
      getLoansByBorrower,
      getPaymentsByLoan,
      getPaymentsByBorrower,
      recordPayment,
      recordBorrowerInterestPayment,
      deletePayment,
      deleteLoan,
      deleteBorrower,
      deletePartner,
      createLoan,
      updateLoan,
      createBorrower,
      updateBorrower,
      createPartner,
      updatePartner,
      toast,
      showToast,
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
      dismissAttention,
      dataLoading,
      dataReady,
      loadProgress,
      syncStatus,
      syncStatusLabel,
      syncMeta,
      retrySync,
      getLoansByBorrower,
      getPaymentsByLoan,
      getPaymentsByBorrower,
      recordPayment,
      recordBorrowerInterestPayment,
      deletePayment,
      deleteLoan,
      deleteBorrower,
      deletePartner,
      createLoan,
      updateLoan,
      createBorrower,
      updateBorrower,
      createPartner,
      updatePartner,
      toast,
      showToast,
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

export function useLoanBook() {
  const ctx = useContext(LoanBookContext)
  if (!ctx) throw new Error('useLoanBook must be used within LoanBookProvider')
  return ctx
}
