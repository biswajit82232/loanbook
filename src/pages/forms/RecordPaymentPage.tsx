import { useMemo, useState } from 'react'
import type { PaymentMode, PaymentType } from '../../data/types'
import {
  buildPaymentAmounts,
  formatCurrency,
  getBorrowerInterestDue,
  getBuiltUpInterest,
  getLoanTotalDue,
  planBorrowerInterestPayment,
} from '../../data/helpers'
import { useLoanBook } from '../../context/LoanBookContext'
import { useNavigation } from '../../context/NavigationContext'
import { formatDisplayDateFromInput, toInputDate } from '../../utils/dateInput'
import { LoanPicker } from '../../components/LoanPicker'
import { BorrowerPicker } from '../../components/BorrowerPicker'
import { OptionButtons } from '../../components/OptionButtons'
import { DateField } from '../../components/DateField'

interface RecordPaymentPageProps {
  scope?: 'loan' | 'borrower_interest'
  loanId?: string
  borrowerId?: string
  paymentType?: PaymentType
}

const PAYMENT_TYPE_OPTIONS = [
  { value: 'interest_only' as const, label: 'Interest only' },
  { value: 'full_settlement' as const, label: 'Full settlement' },
]

const PAYMENT_MODE_OPTIONS = [
  { value: 'UPI' as const, label: 'UPI' },
  { value: 'Cash' as const, label: 'Cash' },
  { value: 'Bank' as const, label: 'Bank' },
  { value: 'Cheque' as const, label: 'Cheque' },
]

export function RecordPaymentPage({
  scope = 'loan',
  loanId: initialLoanId,
  borrowerId: initialBorrowerId,
  paymentType: initialType,
}: RecordPaymentPageProps) {
  if (scope === 'borrower_interest') {
    return <RecordBorrowerInterestForm initialBorrowerId={initialBorrowerId} />
  }

  return (
    <RecordSingleLoanForm initialLoanId={initialLoanId} initialType={initialType} />
  )
}

function RecordBorrowerInterestForm({ initialBorrowerId }: { initialBorrowerId?: string }) {
  const { borrowers, loans, getLoan, recordBorrowerInterestPayment } = useLoanBook()
  const { goBack } = useNavigation()

  const borrowersWithInterest = useMemo(
    () =>
      borrowers.filter((b) => getBorrowerInterestDue(loans, b.id) > 0),
    [borrowers, loans],
  )

  const defaultBorrowerId =
    initialBorrowerId && borrowersWithInterest.some((b) => b.id === initialBorrowerId)
      ? initialBorrowerId
      : borrowersWithInterest.length === 1
        ? borrowersWithInterest[0].id
        : ''

  const [borrowerId, setBorrowerId] = useState(defaultBorrowerId)
  const totalInterestDue = borrowerId ? getBorrowerInterestDue(loans, borrowerId) : 0

  const [amount, setAmount] = useState(() =>
    defaultBorrowerId ? String(getBorrowerInterestDue(loans, defaultBorrowerId)) : '',
  )
  const [date, setDate] = useState(() => toInputDate(new Date()))
  const [mode, setMode] = useState<PaymentMode>('UPI')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')

  const payAmount = Number(amount)
  const plan = useMemo(() => {
    if (!borrowerId || !Number.isFinite(payAmount) || payAmount <= 0) return null
    return planBorrowerInterestPayment(loans, borrowerId, payAmount)
  }, [borrowerId, loans, payAmount])

  function handleBorrowerChange(id: string) {
    setBorrowerId(id)
    const due = getBorrowerInterestDue(loans, id)
    setAmount(due > 0 ? String(due) : '')
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!borrowerId) {
      setError('Select a borrower.')
      return
    }

    if (!plan || !plan.ok) {
      setError(plan && !plan.ok ? plan.error : 'Enter a valid amount.')
      return
    }

    const result = recordBorrowerInterestPayment({
      borrowerId,
      amount: payAmount,
      date: formatDisplayDateFromInput(date),
      mode,
      reference,
    })

    if (result.ok) goBack()
    else setError(result.error)
  }

  if (borrowersWithInterest.length === 0) {
    return (
      <div className="page form-page">
        <p className="empty-inline">No borrowers with interest due</p>
        <button type="button" className="btn btn-secondary" onClick={goBack}>
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="page form-page">
      <form className="form form-page-form" onSubmit={handleSubmit}>
        <BorrowerPicker
          borrowers={borrowersWithInterest}
          value={borrowerId}
          onChange={handleBorrowerChange}
          required
        />

        {borrowerId && (
          <div className="form-summary">
            <span>Total interest due: {formatCurrency(totalInterestDue)}</span>
            <span>
              Active loans:{' '}
              {loans.filter((l) => l.borrowerId === borrowerId && l.status === 'Active').length}
            </span>
          </div>
        )}

        <label className="field">
          <span className="field-label">Amount (₹)</span>
          <input
            type="number"
            min={1}
            step={1}
            max={totalInterestDue > 0 ? totalInterestDue : undefined}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        {plan?.ok && plan.allocations.length > 0 && (
          <div className="allocation-preview">
            <ul className="allocation-preview-list">
              {plan.allocations.map((row) => {
                const loan = getLoan(row.loanId)
                return (
                  <li key={row.loanId} className="allocation-preview-row">
                    <span className="allocation-preview-loan">{row.loanId}</span>
                    <span className="allocation-preview-amount">{formatCurrency(row.amount)}</span>
                    {loan?.purpose && (
                      <span className="allocation-preview-meta">{loan.purpose}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <DateField label="Date" value={date} onChange={setDate} required />

        <OptionButtons
          label="Mode"
          value={mode}
          options={PAYMENT_MODE_OPTIONS}
          onChange={setMode}
        />

        <label className="field">
          <span className="field-label">Reference</span>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-page-actions">
          <button type="button" className="btn btn-secondary" onClick={goBack}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!plan?.ok}>
            Apply to {plan?.ok ? plan.allocations.length : 0} loan
            {plan?.ok && plan.allocations.length === 1 ? '' : 's'}
          </button>
        </div>
      </form>
    </div>
  )
}

function RecordSingleLoanForm({
  initialLoanId,
  initialType,
}: {
  initialLoanId?: string
  initialType?: PaymentType
}) {
  const { loans, getBorrower, getLoan, recordPayment } = useLoanBook()
  const { goBack } = useNavigation()

  const activeLoans = useMemo(() => loans.filter((l) => l.status === 'Active'), [loans])

  const defaultLoanId =
    initialLoanId && activeLoans.some((l) => l.id === initialLoanId) ? initialLoanId : ''

  const defaultType =
    initialType === 'full_settlement' || initialType === 'interest_only'
      ? initialType
      : 'interest_only'
  const defaultLoan = activeLoans.find((l) => l.id === defaultLoanId)

  const [loanId, setLoanId] = useState(defaultLoanId)
  const [type, setType] = useState<PaymentType>(defaultType)
  const [amount, setAmount] = useState(() =>
    defaultLoan
      ? String(
          defaultType === 'full_settlement'
            ? getLoanTotalDue(defaultLoan)
            : getBuiltUpInterest(defaultLoan),
        )
      : '',
  )
  const [date, setDate] = useState(() => toInputDate(new Date()))
  const [mode, setMode] = useState<PaymentMode>('UPI')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')

  const loan = loanId ? getLoan(loanId) : undefined
  const totalDue = loan ? getLoanTotalDue(loan) : 0
  const interestDue = loan ? getBuiltUpInterest(loan) : 0

  const inactiveInitialLoan =
    Boolean(initialLoanId) && !activeLoans.some((l) => l.id === initialLoanId)

  function handleLoanChange(id: string) {
    setLoanId(id)
    const selected = getLoan(id)
    if (!selected) return
    setAmount(
      type === 'full_settlement'
        ? String(getLoanTotalDue(selected))
        : String(getBuiltUpInterest(selected)),
    )
  }

  function handleTypeChange(next: PaymentType) {
    setType(next)
    if (!loan) return
    setAmount(
      next === 'full_settlement' ? String(getLoanTotalDue(loan)) : String(getBuiltUpInterest(loan)),
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!loanId || !activeLoans.some((l) => l.id === loanId)) {
      setError('Select a loan from the list.')
      return
    }

    const selected = getLoan(loanId)
    if (!selected) {
      setError('Loan not found.')
      return
    }

    const payAmount =
      type === 'full_settlement' ? getLoanTotalDue(selected) : Number(amount)

    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      setError('Enter a valid amount.')
      return
    }

    const preview = buildPaymentAmounts(selected, type, payAmount)
    if ('error' in preview) {
      setError(preview.error)
      return
    }

    const result = recordPayment({
      loanId,
      type,
      amount: preview.total,
      date: formatDisplayDateFromInput(date),
      mode,
      reference,
      notes: '',
    })

    if (result.ok) goBack()
    else setError(result.error)
  }

  if (activeLoans.length === 0) {
    return (
      <div className="page form-page">
        <p className="empty-inline">No active loans</p>
        <button type="button" className="btn btn-secondary" onClick={goBack}>
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="page form-page">
      <form className="form form-page-form" onSubmit={handleSubmit}>
        {inactiveInitialLoan && <p className="form-error">Loan not active</p>}

        <LoanPicker
          loans={activeLoans}
          getBorrower={getBorrower}
          value={loanId}
          onChange={handleLoanChange}
          required
        />

        {loan && (
          <div className="form-summary">
            <span>Interest: {formatCurrency(interestDue)}</span>
            <span>Total: {formatCurrency(totalDue)}</span>
          </div>
        )}

        <OptionButtons
          label="Type"
          value={type}
          options={PAYMENT_TYPE_OPTIONS}
          onChange={handleTypeChange}
        />

        <label className="field">
          <span className="field-label">Amount (₹)</span>
          <input
            type="number"
            min={1}
            step={1}
            value={type === 'full_settlement' && loan ? String(totalDue) : amount}
            onChange={(e) => setAmount(e.target.value)}
            readOnly={type === 'full_settlement'}
            required
          />
        </label>

        <DateField label="Date" value={date} onChange={setDate} required />

        <OptionButtons
          label="Mode"
          value={mode}
          options={PAYMENT_MODE_OPTIONS}
          onChange={setMode}
        />

        <label className="field">
          <span className="field-label">Reference</span>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-page-actions">
          <button type="button" className="btn btn-secondary" onClick={goBack}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
