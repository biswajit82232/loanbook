import { useState } from 'react'
import {
  formatCurrency,
  formatDaysLent,
  getLoanLentDays,
  getPaymentTypeLabel,
} from '../../data/helpers'
import { useLoanBook } from '../../context/LoanBookContext'
import { useNavigation } from '../../context/NavigationContext'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Icon } from '../../components/icons'
import { DetailField, DetailGrid, DetailSection } from '../../components/DetailSection'
import { KpiCard } from '../../components/KpiCard'
import { LinkCard } from '../../components/LinkCard'

export function PaymentDetail({ id }: { id: string }) {
  const { goBack } = useNavigation()
  const { getPayment, getLoan, getBorrower, deletePayment } = useLoanBook()
  const payment = getPayment(id)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  function openDeleteConfirm() {
    setDeleteError('')
    setDeleteOpen(true)
  }

  function handleConfirmDelete() {
    if (!payment) return
    const result = deletePayment(payment.id)
    if (result.ok) {
      setDeleteOpen(false)
      goBack()
    } else {
      setDeleteError(result.error)
    }
  }

  if (!payment) {
    return <p className="empty-state">Payment not found.</p>
  }

  const loan = getLoan(payment.loanId)
  const borrower = getBorrower(payment.borrowerId)
  const isSettlement = payment.type === 'full_settlement'

  return (
    <div className="page detail-page">
      <div className="detail-hero">
        <span className={`badge badge-${isSettlement ? 'settlement' : 'interest'}`}>
          {getPaymentTypeLabel(payment.type)}
        </span>
        <p className="detail-hero-amount">{formatCurrency(payment.amount)}</p>
        <p className="detail-hero-sub">{payment.date}</p>
      </div>

      <section className="kpi-grid kpi-grid--2">
        <KpiCard label="To interest" value={formatCurrency(payment.interestAmount)} variant="interest" />
        <KpiCard label="To principal" value={formatCurrency(payment.principalAmount)} variant="accent" />
      </section>

      <DetailSection title="Payment info">
        <DetailGrid>
          <DetailField label="Payment ID" value={payment.id} />
          <DetailField label="Type" value={getPaymentTypeLabel(payment.type)} />
          <DetailField label="Mode" value={payment.mode} />
          <DetailField label="Reference" value={payment.reference} full />
          <DetailField label="Notes" value={payment.notes} full />
        </DetailGrid>
      </DetailSection>

      {loan && (
        <DetailSection title="Linked loan">
          <LinkCard
            title={loan.id}
            subtitle={`${loan.purpose ? `${loan.purpose} · ` : ''}${formatDaysLent(getLoanLentDays(loan), loan)}`}
            meta={loan.status}
            route={{ type: 'loan', id: loan.id }}
          />
        </DetailSection>
      )}

      {borrower && (
        <DetailSection title="Borrower">
          <LinkCard
            title={borrower.name}
            subtitle={borrower.phone}
            meta={borrower.id}
            route={{ type: 'borrower', id: borrower.id }}
          />
        </DetailSection>
      )}

      <div className="detail-actions">
        <button type="button" className="btn btn-danger" onClick={openDeleteConfirm}>
          <span className="btn-inner">
            <Icon name="trash" size={18} className="btn-inner-icon" />
            <span>Delete payment</span>
          </span>
        </button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete payment?"
        message="This will remove the payment and update the linked loan balances."
        confirmLabel="Delete"
        cancelLabel="Keep"
        error={deleteError}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      >
        <div className="modal-summary">
          <strong>{formatCurrency(payment.amount)}</strong>
          <span>
            {getPaymentTypeLabel(payment.type)} · {payment.date}
          </span>
          <span>{payment.id}</span>
          {borrower && <span>{borrower.name}</span>}
        </div>
      </ConfirmDialog>
    </div>
  )
}
