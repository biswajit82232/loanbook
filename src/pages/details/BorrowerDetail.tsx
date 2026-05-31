import { useState } from 'react'
import {
  formatCurrency,
  formatDaysLent,
  getBorrowerInterestDue,
  getBorrowerOutstanding,
  getBorrowerPrincipalDue,
  getLoanLentDays,
  getLoanListAmountLabel,
  getPaymentTypeLabel,
} from '../../data/helpers'
import { BtnIcon } from '../../components/BtnIcon'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Icon } from '../../components/icons'
import { useNavigation } from '../../context/NavigationContext'
import { useLoanBook } from '../../context/LoanBookContext'
import { DetailField, DetailGrid, DetailSection } from '../../components/DetailSection'
import { KpiCard } from '../../components/KpiCard'
import { SafeText } from '../../components/SafeText'
import { LinkCard } from '../../components/LinkCard'
import { formatDisplayPhone } from '../../utils/phone'

export function BorrowerDetail({ id }: { id: string }) {
  const {
    getBorrower,
    getLoansByBorrower,
    getPaymentsByBorrower,
    loans,
    deleteBorrower,
  } = useLoanBook()
  const { openLoanForm, openBorrowerForm, openPaymentForm, goBack } = useNavigation()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const borrower = getBorrower(id)

  if (!borrower) {
    return <p className="empty-state">Borrower not found.</p>
  }

  const person = borrower
  const borrowerLoans = getLoansByBorrower(person.id)
  const borrowerPayments = getPaymentsByBorrower(person.id)
  const totalDue = getBorrowerOutstanding(loans, person.id)

  function openDeleteConfirm() {
    setDeleteError('')
    setDeleteOpen(true)
  }

  function handleConfirmDelete() {
    const result = deleteBorrower(id)
    if (result.ok) {
      setDeleteOpen(false)
      goBack()
    } else {
      setDeleteError(result.error)
    }
  }

  return (
    <div className="page detail-page">
      <div className="detail-hero borrower-hero">
        <div className="avatar avatar-lg">{person.name.charAt(0)}</div>
        <div className="detail-hero-text">
          <SafeText as="p" className="detail-hero-amount">
            {person.name}
          </SafeText>
          <p
            className={`detail-hero-sub${!person.phone.trim() ? ' detail-hero-sub--muted' : ''}`}
          >
            {formatDisplayPhone(person.phone)}
          </p>
        </div>
      </div>

      <section className="kpi-grid kpi-grid--3">
        <KpiCard
          label="Principal due"
          value={formatCurrency(getBorrowerPrincipalDue(loans, person.id))}
          variant="accent"
        />
        <KpiCard
          label="Interest due"
          value={formatCurrency(getBorrowerInterestDue(loans, person.id))}
          variant="interest"
        />
        <KpiCard label="Total due" value={formatCurrency(totalDue)} variant="success" />
      </section>

      <DetailSection title="Contact">
        <DetailGrid>
          <DetailField label="Address" value={person.address} full />
          <DetailField label="Notes" value={person.notes || '—'} full />
        </DetailGrid>
      </DetailSection>

      <DetailSection
        title="Loans"
        count={borrowerLoans.length}
        countLabel={`${borrowerLoans.length} loans`}
      >
        <div className="link-card-list">
          {borrowerLoans.map((loan) => (
            <LinkCard
              key={loan.id}
              title={loan.id}
              subtitle={`${loan.purpose ? `${loan.purpose} · ` : ''}${formatDaysLent(getLoanLentDays(loan), loan)}`}
              meta={getLoanListAmountLabel(loan)}
              route={{ type: 'loan', id: loan.id }}
            />
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Payments">
        {borrowerPayments.length === 0 ? (
          <p className="empty-inline">No payments</p>
        ) : (
          <div className="link-card-list">
            {borrowerPayments.map((p) => (
              <LinkCard
                key={p.id}
                title={getPaymentTypeLabel(p.type)}
                subtitle={p.date}
                meta={formatCurrency(p.amount)}
                route={{ type: 'payment', id: p.id }}
              />
            ))}
          </div>
        )}
      </DetailSection>

      <div className="detail-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openLoanForm({ mode: 'create', borrowerId: person.id })}
        >
          <BtnIcon icon="landmark">New loan</BtnIcon>
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => openBorrowerForm({ mode: 'edit', borrowerId: person.id })}
        >
          <BtnIcon icon="pencil">Edit</BtnIcon>
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => openPaymentForm({ borrowerId: person.id })}
        >
          <BtnIcon icon="wallet">Pay interest (all loans)</BtnIcon>
        </button>
        <button type="button" className="btn btn-danger" onClick={openDeleteConfirm}>
          <span className="btn-inner">
            <Icon name="trash" size={18} className="btn-inner-icon" />
            <span>Delete borrower</span>
          </span>
        </button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete borrower?"
        confirmLabel="Delete"
        cancelLabel="Keep"
        error={deleteError}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      >
        <div className="modal-summary">
          <strong>{person.name}</strong>
          <span>{person.id}</span>
          {borrowerLoans.length > 0 && (
            <span>
              {borrowerLoans.length} loan{borrowerLoans.length === 1 ? '' : 's'} will be deleted
            </span>
          )}
          {borrowerPayments.length > 0 && (
            <span>
              {borrowerPayments.length} payment
              {borrowerPayments.length === 1 ? '' : 's'} will be deleted
            </span>
          )}
        </div>
      </ConfirmDialog>
    </div>
  )
}
