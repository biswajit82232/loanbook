import { getSupabase } from '../lib/supabase'
import { normalizeBorrower, normalizeLoan, normalizePartner } from './helpers'
import { defaultSettings, normalizeSettings } from './settings'
import type {
  AppSettings,
  Borrower,
  InterestEntry,
  Loan,
  LoanBookData,
  LoanPartnerShare,
  Partner,
  Payment,
} from './types'

export interface LoadedLoanBook {
  data: LoanBookData
  settings: AppSettings
}

type BorrowerRow = {
  id: string
  name: string
  phone: string
  address: string
  joined_date: string
  notes: string
}

type PartnerRow = {
  id: string
  name: string
  phone: string
  start_date: string
  status: Partner['status']
  notes: string
}

type LoanRow = {
  id: string
  borrower_id: string
  principal: number
  principal_outstanding: number
  rate: number
  rate_period: Loan['ratePeriod']
  start_date: string
  status: Loan['status']
  purpose: string
  accrued_interest: number
  interest_collected: number
  last_payment_date: string | null
  interest_log: InterestEntry[]
  partner_shares: LoanPartnerShare[]
}

type PaymentRow = {
  id: string
  loan_id: string
  borrower_id: string
  date: string
  amount: number
  type: Payment['type']
  interest_amount: number
  principal_amount: number
  mode: Payment['mode']
  reference: string
  notes: string
}

function mapBorrower(row: BorrowerRow): Borrower {
  return normalizeBorrower({
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    joinedDate: row.joined_date,
    notes: row.notes,
  })
}

function mapPartner(row: PartnerRow): Partner {
  return normalizePartner({
    id: row.id,
    name: row.name,
    phone: row.phone,
    startDate: row.start_date,
    status: row.status,
    notes: row.notes,
  })
}

function mapLoan(row: LoanRow): Loan {
  return normalizeLoan({
    id: row.id,
    borrowerId: row.borrower_id,
    principal: Number(row.principal),
    principalOutstanding: Number(row.principal_outstanding),
    rate: Number(row.rate),
    ratePeriod: row.rate_period,
    startDate: row.start_date,
    status: row.status,
    purpose: row.purpose,
    accruedInterest: Number(row.accrued_interest),
    interestCollected: Number(row.interest_collected),
    lastPaymentDate: row.last_payment_date ?? undefined,
    interestLog: row.interest_log ?? [],
    partnerShares: row.partner_shares ?? [],
  })
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    loanId: row.loan_id,
    borrowerId: row.borrower_id,
    date: row.date,
    amount: Number(row.amount),
    type: row.type,
    interestAmount: Number(row.interest_amount),
    principalAmount: Number(row.principal_amount),
    mode: row.mode,
    reference: row.reference,
    notes: row.notes,
  }
}

export async function fetchLoanBook(userId: string): Promise<LoadedLoanBook> {
  const supabase = getSupabase()

  const [borrowersRes, partnersRes, loansRes, paymentsRes, settingsRes] = await Promise.all([
    supabase.from('borrowers').select('*').eq('user_id', userId),
    supabase.from('partners').select('*').eq('user_id', userId),
    supabase.from('loans').select('*').eq('user_id', userId),
    supabase.from('payments').select('*').eq('user_id', userId),
    supabase.from('user_settings').select('settings').eq('user_id', userId).maybeSingle(),
  ])

  if (borrowersRes.error) throw borrowersRes.error
  if (partnersRes.error) throw partnersRes.error
  if (loansRes.error) throw loansRes.error
  if (paymentsRes.error) throw paymentsRes.error
  if (settingsRes.error) throw settingsRes.error

  const settings = normalizeSettings(
    (settingsRes.data?.settings as Partial<AppSettings> | undefined) ?? defaultSettings,
  )

  return {
    data: {
      borrowers: (borrowersRes.data as BorrowerRow[]).map(mapBorrower),
      partners: (partnersRes.data as PartnerRow[]).map(mapPartner),
      loans: (loansRes.data as LoanRow[]).map(mapLoan),
      payments: (paymentsRes.data as PaymentRow[]).map(mapPayment),
    },
    settings,
  }
}

export async function syncLoanBook(
  userId: string,
  data: LoanBookData,
  settings: AppSettings,
): Promise<{ error: string | null }> {
  const supabase = getSupabase()
  const normalized = normalizeSettings(settings)

  const borrowerRows = data.borrowers.map((b) => ({
    id: b.id,
    user_id: userId,
    name: b.name,
    phone: b.phone,
    address: b.address,
    joined_date: b.joinedDate,
    notes: b.notes,
  }))

  const partnerRows = data.partners.map((p) => ({
    id: p.id,
    user_id: userId,
    name: p.name,
    phone: p.phone,
    start_date: p.startDate,
    status: p.status,
    notes: p.notes,
  }))

  const loanRows = data.loans.map((l) => ({
    id: l.id,
    user_id: userId,
    borrower_id: l.borrowerId,
    principal: l.principal,
    principal_outstanding: l.principalOutstanding,
    rate: l.rate,
    rate_period: l.ratePeriod,
    start_date: l.startDate,
    status: l.status,
    purpose: l.purpose,
    accrued_interest: l.accruedInterest,
    interest_collected: l.interestCollected,
    last_payment_date: l.lastPaymentDate ?? null,
    interest_log: l.interestLog,
    partner_shares: l.partnerShares,
  }))

  const paymentRows = data.payments.map((p) => ({
    id: p.id,
    user_id: userId,
    loan_id: p.loanId,
    borrower_id: p.borrowerId,
    date: p.date,
    amount: p.amount,
    type: p.type,
    interest_amount: p.interestAmount,
    principal_amount: p.principalAmount,
    mode: p.mode,
    reference: p.reference,
    notes: p.notes,
  }))

  const tables = [
    { name: 'payments' as const, ids: data.payments.map((p) => p.id) },
    { name: 'loans' as const, ids: data.loans.map((l) => l.id) },
    { name: 'partners' as const, ids: data.partners.map((p) => p.id) },
    { name: 'borrowers' as const, ids: data.borrowers.map((b) => b.id) },
  ]

  for (const { name, ids } of tables) {
    const { data: existing, error: listError } = await supabase
      .from(name)
      .select('id')
      .eq('user_id', userId)
    if (listError) return { error: listError.message }

    const toDelete = (existing ?? [])
      .map((row) => (row as { id: string }).id)
      .filter((id) => !ids.includes(id))

    if (toDelete.length > 0) {
      const { error: delError } = await supabase
        .from(name)
        .delete()
        .eq('user_id', userId)
        .in('id', toDelete)
      if (delError) return { error: delError.message }
    }
  }

  if (borrowerRows.length > 0) {
    const { error } = await supabase.from('borrowers').upsert(borrowerRows, {
      onConflict: 'user_id,id',
    })
    if (error) return { error: error.message }
  }

  if (partnerRows.length > 0) {
    const { error } = await supabase.from('partners').upsert(partnerRows, {
      onConflict: 'user_id,id',
    })
    if (error) return { error: error.message }
  }

  if (loanRows.length > 0) {
    const { error } = await supabase.from('loans').upsert(loanRows, {
      onConflict: 'user_id,id',
    })
    if (error) return { error: error.message }
  }

  if (paymentRows.length > 0) {
    const { error } = await supabase.from('payments').upsert(paymentRows, {
      onConflict: 'user_id,id',
    })
    if (error) return { error: error.message }
  }

  const { error: settingsError } = await supabase.from('user_settings').upsert({
    user_id: userId,
    settings: normalized,
    updated_at: new Date().toISOString(),
  })
  if (settingsError) return { error: settingsError.message }

  return { error: null }
}
