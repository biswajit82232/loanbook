import { useState } from 'react'
import type { InterestRatePeriod, LoanPartnerShare } from '../../data/types'
import { getBuiltUpInterest, validatePartnerShares } from '../../data/helpers'
import { formatDisplayDateFromInput } from '../../utils/dateInput'
import { useLoanBook } from '../../context/LoanBookContext'
import { useNavigation } from '../../context/NavigationContext'
import { toInputDate, toInputDateFromDisplay } from '../../utils/dateInput'
import { BorrowerPicker } from '../../components/BorrowerPicker'
import { OptionButtons } from '../../components/OptionButtons'
import { DateField } from '../../components/DateField'
import { LoanPartnerSharesEditor } from '../../components/LoanPartnerSharesEditor'

interface LoanFormPageProps {
  mode: 'create' | 'edit'
  loanId?: string
  borrowerId?: string
}

const RATE_PERIOD_OPTIONS = [
  { value: 'monthly' as const, label: 'Monthly' },
  { value: 'yearly' as const, label: 'Yearly' },
]

const STATUS_OPTIONS = [
  { value: 'Active' as const, label: 'Active' },
  { value: 'Pending' as const, label: 'Pending' },
]

export function LoanFormPage({ mode, loanId, borrowerId: presetBorrowerId }: LoanFormPageProps) {
  const { borrowers, partners, payments, settings, getLoan, createLoan, updateLoan } =
    useLoanBook()
  const { goBack, openBorrowerForm } = useNavigation()

  const isEdit = mode === 'edit'
  const existing = isEdit && loanId ? getLoan(loanId) : undefined
  const isClosed = existing?.status === 'Closed'

  const [borrowerId, setBorrowerId] = useState(() => {
    if (isEdit && existing) return existing.borrowerId
    if (presetBorrowerId && borrowers.some((b) => b.id === presetBorrowerId)) {
      return presetBorrowerId
    }
    return ''
  })
  const [principal, setPrincipal] = useState(
    () => (isEdit && existing ? String(existing.principal) : ''),
  )
  const [rate, setRate] = useState(() =>
    isEdit && existing ? String(existing.rate) : String(settings.defaultRate),
  )
  const [ratePeriod, setRatePeriod] = useState<InterestRatePeriod>(() =>
    isEdit && existing ? existing.ratePeriod : settings.defaultRatePeriod,
  )
  const [startDate, setStartDate] = useState(() =>
    isEdit && existing ? toInputDateFromDisplay(existing.startDate) : toInputDate(new Date()),
  )
  const [purpose, setPurpose] = useState(() => (isEdit && existing ? existing.purpose : ''))
  const [description, setDescription] = useState(
    () => (isEdit && existing ? existing.description : ''),
  )
  const [status, setStatus] = useState<'Active' | 'Pending'>(() =>
    isEdit && existing && existing.status === 'Pending' ? 'Pending' : 'Active',
  )
  const [interestOverride, setInterestOverride] = useState(() =>
    isEdit && existing ? String(getBuiltUpInterest(existing)) : '',
  )
  const [partnerShares, setPartnerShares] = useState<LoanPartnerShare[]>(() =>
    isEdit && existing ? [...(existing.partnerShares ?? [])] : [],
  )
  const [valueLimit, setValueLimit] = useState(() =>
    isEdit && existing && existing.valueLimit > 0 ? String(existing.valueLimit) : '',
  )
  const [error, setError] = useState('')

  const hasPayments =
    existing !== undefined && payments.some((p) => p.loanId === existing.id)

  if (isEdit && loanId && !existing) {
    return (
      <div className="page form-page">
        <p className="empty-state">Loan not found.</p>
        <button type="button" className="btn btn-secondary" onClick={goBack}>
          Back
        </button>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!borrowerId || !borrowers.some((b) => b.id === borrowerId)) {
      setError('Select a borrower from the list.')
      return
    }

    const principalNum = Number(principal)
    const rateNum = Number(rate)
    const interestNum = interestOverride === '' ? undefined : Number(interestOverride)
    const currentInterest = existing ? getBuiltUpInterest(existing) : 0
    const interestChanged =
      isEdit && existing && interestNum !== undefined && interestNum !== currentInterest

    const filledShares = partnerShares.filter((s) => s.partnerId)
    const shareErr = validatePartnerShares(filledShares, partners, principalNum)
    if (shareErr) {
      setError(shareErr)
      return
    }
    const validShares = partnerShares.filter((s) => s.partnerId)

    if (!Number.isFinite(principalNum) || principalNum <= 0) {
      setError('Principal must be greater than zero.')
      return
    }
    if (!Number.isFinite(rateNum) || rateNum < 0) {
      setError('Enter a valid interest rate.')
      return
    }

    const valueLimitNum =
      valueLimit.trim() === '' ? 0 : Number(valueLimit)
    if (valueLimit.trim() !== '' && (!Number.isFinite(valueLimitNum) || valueLimitNum < 0)) {
      setError('Enter a valid value limit (or leave empty to turn off).')
      return
    }

    if (isEdit && existing) {
      const result = updateLoan({
        loanId: existing.id,
        borrowerId: isClosed ? undefined : borrowerId,
        purpose,
        description,
        rate: isClosed ? undefined : rateNum,
        ratePeriod: isClosed ? undefined : ratePeriod,
        startDate: isClosed ? undefined : formatDisplayDateFromInput(startDate),
        status: isClosed ? undefined : status,
        principal: isClosed ? undefined : principalNum,
        accruedInterest: isClosed || !interestChanged || hasPayments ? undefined : interestNum,
        partnerShares: isClosed ? undefined : validShares,
        valueLimit: valueLimitNum,
      })
      if (result.ok) goBack()
      else setError(result.error)
      return
    }

    const result = createLoan({
      borrowerId,
      principal: principalNum,
      rate: rateNum,
      ratePeriod,
      startDate: formatDisplayDateFromInput(startDate),
      purpose,
      description,
      status,
      initialAccruedInterest: 0,
      partnerShares: validShares,
      valueLimit: valueLimitNum,
    })
    if (result.ok) goBack()
    else setError(result.error)
  }

  if (borrowers.length === 0 && !isEdit) {
    return (
      <div className="page form-page">
        <p className="empty-inline">No borrowers</p>
        <div className="form-page-actions">
          <button type="button" className="btn btn-secondary" onClick={goBack}>
            Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openBorrowerForm({ mode: 'create' })}
          >
            Add borrower
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page form-page">
      <form className="form form-page-form" onSubmit={handleSubmit}>
        {!isClosed && (
          <>
            <BorrowerPicker
              borrowers={borrowers}
              value={borrowerId}
              onChange={setBorrowerId}
              disabled={isEdit && hasPayments}
              required
            />

            <label className="field">
              <span className="field-label">Principal (₹)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                required
                disabled={isEdit && hasPayments}
              />
            </label>

            <label className="field">
              <span className="field-label">Rate (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.25}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
                disabled={isEdit && hasPayments}
              />
            </label>

            <OptionButtons
              label="Period"
              value={ratePeriod}
              options={RATE_PERIOD_OPTIONS}
              onChange={setRatePeriod}
              disabled={isEdit && hasPayments}
            />

            <DateField
              label="Lent on"
              value={startDate}
              onChange={setStartDate}
              required
              disabled={isEdit && hasPayments}
            />

            <label className="field">
              <span className="field-label">Value limit (₹)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={valueLimit}
                onChange={(e) => setValueLimit(e.target.value)}
                placeholder="Optional — alert near limit"
              />
              <span className="field-hint">
                Red alert when principal due + interest reaches 90% of this amount. Leave empty to
                disable.
              </span>
            </label>

            <OptionButtons
              label="Status"
              value={status}
              options={STATUS_OPTIONS}
              onChange={setStatus}
              disabled={isEdit && hasPayments}
            />

            {isEdit && status === 'Active' && !hasPayments && (
              <label className="field">
                <span className="field-label">Interest due (₹)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={interestOverride}
                  onChange={(e) => setInterestOverride(e.target.value)}
                />
              </label>
            )}

            <LoanPartnerSharesEditor
              partners={partners}
              shares={partnerShares}
              onChange={setPartnerShares}
              loanPrincipal={Number(principal) || 0}
              defaultRate={Number(rate) || settings.defaultRate}
              defaultRatePeriod={ratePeriod}
            />
          </>
        )}

        {isClosed && (
          <label className="field">
            <span className="field-label">Value limit (₹)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={valueLimit}
              onChange={(e) => setValueLimit(e.target.value)}
              placeholder="Optional — alert near limit"
            />
            <span className="field-hint">
              Red alert when principal due + interest reaches 90% of this amount.
            </span>
          </label>
        )}

        <label className="field">
          <span className="field-label">Purpose</span>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Description</span>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-page-actions">
          <button type="button" className="btn btn-secondary" onClick={goBack}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
