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
import type { PaymentType } from '../data/types'
import { PAGE_TITLES } from '../constants/navigation'
import type { PageId } from '../data/types'
import { useLoanBook } from './LoanBookContext'

export type DetailRoute =
  | { type: 'loan'; id: string }
  | { type: 'borrower'; id: string }
  | { type: 'partner'; id: string }
  | { type: 'payment'; id: string }
  | { type: 'report'; id: string }
  | {
      type: 'record-payment'
      scope?: 'loan' | 'borrower_interest'
      loanId?: string
      borrowerId?: string
      paymentType?: PaymentType
    }
  | { type: 'loan-form'; mode: 'create'; borrowerId?: string }
  | { type: 'loan-form'; mode: 'edit'; id: string }
  | { type: 'borrower-form'; mode: 'create'; prefillName?: string }
  | { type: 'borrower-form'; mode: 'edit'; id: string }
  | { type: 'partner-form'; mode: 'create' }
  | { type: 'partner-form'; mode: 'edit'; id: string }

export interface LoanBookHistoryState {
  loanbook: true
  page: PageId
  detail: DetailRoute | null
  detailStack: DetailRoute[]
}

interface NavigationContextValue {
  page: PageId
  detail: DetailRoute | null
  title: string
  canGoBack: boolean
  setPage: (page: PageId) => void
  openDetail: (route: DetailRoute) => void
  openPaymentForm: (opts?: {
    loanId?: string
    borrowerId?: string
    type?: PaymentType
  }) => void
  openLoanForm: (opts: {
    mode: 'create' | 'edit'
    loanId?: string
    borrowerId?: string
  }) => void
  openBorrowerForm: (opts: {
    mode: 'create' | 'edit'
    borrowerId?: string
    prefillName?: string
  }) => void
  openPartnerForm: (opts: { mode: 'create' | 'edit'; partnerId?: string }) => void
  goBack: () => void
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

function pageForRoute(route: DetailRoute): PageId {
  switch (route.type) {
    case 'loan':
    case 'loan-form':
      return 'loans'
    case 'borrower':
    case 'borrower-form':
      return 'borrowers'
    case 'partner':
    case 'partner-form':
      return 'partners'
    case 'payment':
    case 'record-payment':
      return 'payments'
    case 'report':
      return 'reports'
  }
}

function buildHistoryState(
  page: PageId,
  detail: DetailRoute | null,
  detailStack: DetailRoute[],
): LoanBookHistoryState {
  return { loanbook: true, page, detail, detailStack }
}

function historyUrl(page: PageId, detail: DetailRoute | null): string {
  const base = `${window.location.pathname}${window.location.search}`
  if (!detail) return `${base}#/${page}`

  switch (detail.type) {
    case 'loan':
      return `${base}#/loans/loan/${detail.id}`
    case 'borrower':
      return `${base}#/borrowers/borrower/${detail.id}`
    case 'partner':
      return `${base}#/partners/partner/${detail.id}`
    case 'payment':
      return `${base}#/payments/payment/${detail.id}`
    case 'report':
      return `${base}#/reports/report/${detail.id}`
    case 'record-payment': {
      let path = `${base}#/payments/record`
      if (detail.scope === 'borrower_interest' && detail.borrowerId) {
        path += `/borrower/${detail.borrowerId}`
      } else {
        if (detail.loanId) path += `/${detail.loanId}`
        if (detail.paymentType) path += `/${detail.paymentType}`
      }
      return path
    }
    case 'loan-form':
      if (detail.mode === 'create') {
        return detail.borrowerId
          ? `${base}#/loans/new/${detail.borrowerId}`
          : `${base}#/loans/new`
      }
      return `${base}#/loans/edit/${detail.id}`
    case 'borrower-form':
      if (detail.mode === 'create') return `${base}#/borrowers/new`
      return `${base}#/borrowers/edit/${detail.id}`
    case 'partner-form':
      if (detail.mode === 'create') return `${base}#/partners/new`
      return `${base}#/partners/edit/${detail.id}`
  }
}

function replaceHistory(state: LoanBookHistoryState) {
  window.history.replaceState(state, '', historyUrl(state.page, state.detail))
}

function pushHistory(state: LoanBookHistoryState) {
  window.history.pushState(state, '', historyUrl(state.page, state.detail))
}

function parseDetailRoute(page: PageId, parts: string[]): DetailRoute | null {
  if (parts.length === 0) return null

  if (parts[0] === 'record') {
    if (parts[1] === 'borrower' && parts[2]) {
      return {
        type: 'record-payment',
        scope: 'borrower_interest',
        borrowerId: parts[2],
      }
    }
    const rawType = parts[2]
    const paymentType: PaymentType | undefined =
      rawType === 'interest_only' || rawType === 'full_settlement' ? rawType : undefined
    return {
      type: 'record-payment',
      scope: 'loan',
      loanId: parts[1],
      paymentType,
    }
  }

  if (page === 'loans' && parts[0] === 'new') {
    return { type: 'loan-form', mode: 'create', borrowerId: parts[1] }
  }
  if (page === 'loans' && parts[0] === 'edit' && parts[1]) {
    return { type: 'loan-form', mode: 'edit', id: parts[1] }
  }
  if (page === 'borrowers' && parts[0] === 'new') {
    return { type: 'borrower-form', mode: 'create' }
  }
  if (page === 'borrowers' && parts[0] === 'edit' && parts[1]) {
    return { type: 'borrower-form', mode: 'edit', id: parts[1] }
  }
  if (page === 'partners' && parts[0] === 'new') {
    return { type: 'partner-form', mode: 'create' }
  }
  if (page === 'partners' && parts[0] === 'edit' && parts[1]) {
    return { type: 'partner-form', mode: 'edit', id: parts[1] }
  }

  const [type, ...idParts] = parts
  const id = idParts.join('/')
  if (type === 'loan' && id) return { type: 'loan', id }
  if (type === 'borrower' && id) return { type: 'borrower', id }
  if (type === 'partner' && id) return { type: 'partner', id }
  if (type === 'payment' && id) return { type: 'payment', id }
  if (type === 'report' && id) return { type: 'report', id }

  return null
}

function parseHash(): LoanBookHistoryState | null {
  const raw = window.location.hash.replace(/^#\/?/, '')
  if (!raw) return null

  const parts = raw.split('/')
  const page = parts[0] as PageId
  if (!PAGE_TITLES[page]) return null

  if (parts.length === 1) return buildHistoryState(page, null, [])

  const detail = parseDetailRoute(page, parts.slice(1))
  if (!detail) return buildHistoryState(page, null, [])

  return buildHistoryState(pageForRoute(detail), detail, [])
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const { getLoan, getBorrower, getPartner, getPayment, getMonthSummary } = useLoanBook()

  const [page, setPageState] = useState<PageId>(() => parseHash()?.page ?? 'dashboard')
  const [detail, setDetail] = useState<DetailRoute | null>(() => parseHash()?.detail ?? null)
  const [detailStack, setDetailStack] = useState<DetailRoute[]>([])
  const skipNextPop = useRef(false)

  const syncReplace = useCallback(
    (nextPage: PageId, nextDetail: DetailRoute | null, stack: DetailRoute[]) => {
      replaceHistory(buildHistoryState(nextPage, nextDetail, stack))
    },
    [],
  )

  const applySnapshot = useCallback((state: LoanBookHistoryState) => {
    setPageState(state.page)
    setDetail(state.detail)
    setDetailStack(state.detailStack ?? [])
  }, [])

  useEffect(() => {
    const fromHash = parseHash()
    const initial = fromHash ?? buildHistoryState('dashboard', null, [])
    if (!(window.history.state as LoanBookHistoryState | null)?.loanbook) {
      replaceHistory(initial)
      if (fromHash) applySnapshot(fromHash)
    }

    const onPopState = () => {
      if (skipNextPop.current) {
        skipNextPop.current = false
        return
      }

      const state = window.history.state as LoanBookHistoryState | null
      if (state?.loanbook) {
        applySnapshot(state)
        return
      }

      const fromHashOnPop = parseHash()
      if (fromHashOnPop) applySnapshot(fromHashOnPop)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [applySnapshot])

  const resolveDetailTitle = useCallback(
    (d: DetailRoute): string => {
      switch (d.type) {
        case 'loan': {
          const loan = getLoan(d.id)
          return loan ? loan.id : 'Loan'
        }
        case 'borrower': {
          const borrower = getBorrower(d.id)
          return borrower ? borrower.name : 'Borrower'
        }
        case 'partner': {
          const partner = getPartner(d.id)
          return partner ? partner.name : 'Partner'
        }
        case 'payment': {
          const payment = getPayment(d.id)
          return payment ? payment.id : 'Payment'
        }
        case 'report': {
          const month = getMonthSummary(d.id)
          return month ? month.title : 'Report'
        }
        case 'record-payment':
          if (d.scope === 'borrower_interest' && d.borrowerId) {
            const borrower = getBorrower(d.borrowerId)
            return borrower ? `Interest · ${borrower.name}` : 'Borrower interest'
          }
          return 'Record payment'
        case 'loan-form':
          return d.mode === 'create' ? 'New loan' : `Edit ${d.id}`
        case 'borrower-form': {
          if (d.mode === 'create') return 'Add borrower'
          const borrower = getBorrower(d.id)
          return borrower ? `Edit ${borrower.name}` : 'Edit borrower'
        }
        case 'partner-form': {
          if (d.mode === 'create') return 'Add partner'
          const partner = getPartner(d.id)
          return partner ? `Edit ${partner.name}` : 'Edit partner'
        }
      }
    },
    [getLoan, getBorrower, getPartner, getPayment, getMonthSummary],
  )

  const navigateTo = useCallback(
    (route: DetailRoute) => {
      const nextPage = pageForRoute(route)
      const stack = detail ? [...detailStack, detail] : detailStack
      const state = buildHistoryState(nextPage, route, stack)
      pushHistory(state)
      setPageState(nextPage)
      setDetail(route)
      setDetailStack(stack)
    },
    [detail, detailStack],
  )

  const setPage = useCallback(
    (next: PageId) => {
      setPageState(next)
      setDetail(null)
      setDetailStack([])
      syncReplace(next, null, [])
    },
    [syncReplace],
  )

  const openDetail = useCallback(
    (route: DetailRoute) => {
      navigateTo(route)
    },
    [navigateTo],
  )

  const openPaymentForm = useCallback(
    (opts?: { loanId?: string; borrowerId?: string; type?: PaymentType }) => {
      if (opts?.borrowerId) {
        navigateTo({
          type: 'record-payment',
          scope: 'borrower_interest',
          borrowerId: opts.borrowerId,
        })
        return
      }
      navigateTo({
        type: 'record-payment',
        scope: 'loan',
        loanId: opts?.loanId,
        paymentType: opts?.type,
      })
    },
    [navigateTo],
  )

  const openLoanForm = useCallback(
    (opts: { mode: 'create' | 'edit'; loanId?: string; borrowerId?: string }) => {
      if (opts.mode === 'edit' && opts.loanId) {
        navigateTo({ type: 'loan-form', mode: 'edit', id: opts.loanId })
      } else {
        navigateTo({ type: 'loan-form', mode: 'create', borrowerId: opts.borrowerId })
      }
    },
    [navigateTo],
  )

  const openBorrowerForm = useCallback(
    (opts: { mode: 'create' | 'edit'; borrowerId?: string; prefillName?: string }) => {
      if (opts.mode === 'edit' && opts.borrowerId) {
        navigateTo({ type: 'borrower-form', mode: 'edit', id: opts.borrowerId })
      } else {
        navigateTo({
          type: 'borrower-form',
          mode: 'create',
          prefillName: opts.prefillName?.trim() || undefined,
        })
      }
    },
    [navigateTo],
  )

  const openPartnerForm = useCallback(
    (opts: { mode: 'create' | 'edit'; partnerId?: string }) => {
      if (opts.mode === 'edit' && opts.partnerId) {
        navigateTo({ type: 'partner-form', mode: 'edit', id: opts.partnerId })
      } else {
        navigateTo({ type: 'partner-form', mode: 'create' })
      }
    },
    [navigateTo],
  )

  const goBack = useCallback(() => {
    if (detail) {
      window.history.back()
    }
  }, [detail])

  const title = detail ? resolveDetailTitle(detail) : PAGE_TITLES[page]
  const canGoBack = Boolean(detail)

  const value = useMemo(
    () => ({
      page,
      detail,
      title,
      canGoBack,
      setPage,
      openDetail,
      openPaymentForm,
      openLoanForm,
      openBorrowerForm,
      openPartnerForm,
      goBack,
    }),
    [
      page,
      detail,
      title,
      canGoBack,
      setPage,
      openDetail,
      openPaymentForm,
      openLoanForm,
      openBorrowerForm,
      openPartnerForm,
      goBack,
    ],
  )

  return (
    <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
  )
}

export function useNavigation() {
  const ctx = useContext(NavigationContext)
  if (!ctx) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return ctx
}
