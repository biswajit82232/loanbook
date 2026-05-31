export type PageId =
  | 'dashboard'
  | 'loans'
  | 'borrowers'
  | 'partners'
  | 'payments'
  | 'reports'
  | 'settings'

export interface NavItem {
  id: PageId
  label: string
}

export type LoanStatus = 'Active' | 'Pending' | 'Closed'
export type PartnerStatus = 'Active' | 'Inactive'
export type PaymentType = 'interest_only' | 'full_settlement'
export type InterestRatePeriod = 'monthly' | 'yearly'
export type PaymentMode = 'UPI' | 'Cash' | 'Bank' | 'Cheque'

export interface Borrower {
  id: string
  name: string
  phone: string
  address: string
  joinedDate: string
  /** Last time the borrower record was created or edited (display date). */
  updatedAt: string
  notes: string
}

export interface InterestEntry {
  id: string
  periodLabel: string
  amount: number
  status: 'outstanding' | 'paid'
  paidOn?: string
}

export interface LoanPartnerShare {
  partnerId: string
  amount: number
  rate: number
  ratePeriod: InterestRatePeriod
}

export interface Loan {
  id: string
  borrowerId: string
  principal: number
  principalOutstanding: number
  rate: number
  ratePeriod: InterestRatePeriod
  startDate: string
  status: LoanStatus
  purpose: string
  /** Optional longer notes about the loan (shown on detail when set). */
  description: string
  accruedInterest: number
  interestCollected: number
  lastPaymentDate?: string
  interestLog: InterestEntry[]
  partnerShares: LoanPartnerShare[]
}

export interface Payment {
  id: string
  loanId: string
  borrowerId: string
  date: string
  amount: number
  type: PaymentType
  interestAmount: number
  principalAmount: number
  mode: PaymentMode
  reference: string
  notes: string
}

export interface RecordPaymentInput {
  loanId: string
  type: PaymentType
  amount: number
  date: string
  mode: PaymentMode
  reference?: string
  notes?: string
}

/** One payment amount applied to a single loan as part of a borrower-wide interest payment. */
export interface BorrowerInterestAllocation {
  loanId: string
  amount: number
}

export interface RecordBorrowerInterestPaymentInput {
  borrowerId: string
  amount: number
  date: string
  mode: PaymentMode
  reference?: string
  notes?: string
}

export interface Partner {
  id: string
  name: string
  phone: string
  startDate: string
  status: PartnerStatus
  notes: string
}

export interface LoanBookData {
  borrowers: Borrower[]
  loans: Loan[]
  payments: Payment[]
  partners: Partner[]
}

export type ThemePreference = 'system' | 'light' | 'dark'
export type AccentColor = 'teal' | 'blue' | 'violet' | 'amber'
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP'

export interface AppSettings {
  businessName: string
  defaultRate: number
  defaultRatePeriod: InterestRatePeriod
  theme: ThemePreference
  accent: AccentColor
  currency: CurrencyCode
  compactLists: boolean
  reminderPeriodDays: number
  /** Dismissed keys for the notification bell only. */
  reminderDismissed: string[]
  /** Dismissed keys for dashboard Needs attention only (independent of bell). */
  attentionDismissed: string[]
}

export interface CreateLoanInput {
  borrowerId: string
  principal: number
  rate: number
  ratePeriod: InterestRatePeriod
  startDate: string
  purpose: string
  description?: string
  status: 'Active' | 'Pending'
  initialAccruedInterest?: number
  partnerShares?: LoanPartnerShare[]
}

export interface UpdateLoanInput {
  loanId: string
  borrowerId?: string
  purpose?: string
  description?: string
  rate?: number
  ratePeriod?: InterestRatePeriod
  startDate?: string
  status?: 'Active' | 'Pending'
  principal?: number
  accruedInterest?: number
  partnerShares?: LoanPartnerShare[]
}

export interface CreateBorrowerInput {
  name: string
  phone?: string
  address?: string
  notes?: string
}

export interface UpdateBorrowerInput {
  borrowerId: string
  name?: string
  phone?: string
  address?: string
  notes?: string
}

export interface CreatePartnerInput {
  name: string
  phone?: string
  startDate: string
  status: PartnerStatus
  notes?: string
}

export interface UpdatePartnerInput {
  partnerId: string
  name?: string
  phone?: string
  startDate?: string
  status?: PartnerStatus
  notes?: string
}
