import { useState } from 'react'
import {
  calculatePartnerInterestOnLoan,
  formatCurrency,
  formatRate,
  formatDaysLent,
  formatShareRate,
  getBuiltUpInterest,
  getInterestLogForDisplay,
  getLoanLentDays,
  getBorrowerOutstanding,
  getLoanTotalDue,
  getPartnerDeployedOnLoan,
  getPaymentTypeLabel,
} from '../../data/helpers'
import { BtnIcon } from '../../components/BtnIcon'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Icon } from '../../components/icons'
import { formatDueSummary, getLoanDueInfo } from '../../data/loan-due'
import { formatValueLimitBadgeLabel, getLoanValueLimitAlert } from '../../data/loan-value-limit'
import { useNavigation } from '../../context/NavigationContext'
import { useLoanBook } from '../../context/LoanBookContext'
import { DetailField, DetailGrid, DetailSection } from '../../components/DetailSection'
import { KpiCard } from '../../components/KpiCard'
import { LinkCard } from '../../components/LinkCard'
import { SafeAmount } from '../../components/SafeAmount'
import { SafeText } from '../../components/SafeText'

export function LoanDetail({ id }: { id: string }) {
  const { openPaymentForm, openLoanForm, goBack } = useNavigation()
  const { getLoan, getBorrower, getPartner, getPaymentsByLoan, loans, settings, deleteLoan } =
    useLoanBook()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const loan = getLoan(id)

  if (!loan) {
    return <p className="empty-state">Loan not found.</p>
  }

  const borrower = getBorrower(loan.borrowerId)
  const loanPayments = getPaymentsByLoan(loan.id)

  function openDeleteConfirm() {
    setDeleteError('')
    setDeleteOpen(true)
  }

  function handleConfirmDelete() {
    const result = deleteLoan(id)
    if (result.ok) {
      setDeleteOpen(false)
      goBack()
    } else {
      setDeleteError(result.error)
    }
  }

  const builtUpInterest = getBuiltUpInterest(loan)
  const totalDue = getLoanTotalDue(loan)
  const isActive = loan.status === 'Active'
  const daysLent = getLoanLentDays(loan)
  const interestLogRows = getInterestLogForDisplay(loan)
  const due = getLoanDueInfo(loan, new Date(), settings.reminderPeriodDays)
  const dueSummary = formatDueSummary(due)
  const valueLimitAlert = getLoanValueLimitAlert(loan)

  return (
    <div className="page detail-page">
      <div className="detail-hero">
        <span className="detail-hero-badges">
          {valueLimitAlert && (
            <span
              className={`badge ${
                valueLimitAlert.severity === 'at_limit' ? 'badge-urgent' : 'badge-danger'
              }`}
            >
              {formatValueLimitBadgeLabel(valueLimitAlert)}
            </span>
          )}
          {due.status !== 'none' && due.status !== 'upcoming' && (
            <span className={`badge badge-${due.status === 'overdue' ? 'due' : due.status === 'due_soon' ? 'due-soon' : 'pending'}`}>
              {due.statusLabel}
            </span>
          )}
          <span className={`badge badge-${loan.status.toLowerCase()}`}>{loan.status}</span>
        </span>
        <SafeAmount amount={loan.principal} className="detail-hero-amount" />
        <p className="detail-hero-sub text-safe">
          {loan.purpose && <>{loan.purpose}</>}
          {loan.status !== 'Pending' && daysLent !== null && (
            <>
              {loan.purpose && ' · '}
              {formatDaysLent(daysLent, loan)}
            </>
          )}
        </p>
      </div>

      <section className="kpi-grid kpi-grid--4">
        <KpiCard label="Principal" value={formatCurrency(loan.principalOutstanding)} variant="accent" />
        <KpiCard label="Interest" value={formatCurrency(builtUpInterest)} variant="interest" />
        <KpiCard
          label="Total due"
          value={isActive ? formatCurrency(totalDue) : '—'}
          variant="success"
        />
        <KpiCard label="Rate" value={formatRate(loan)} />
      </section>

      <DetailSection title="Details">
        <DetailGrid>
          <DetailField label="Loan ID" value={loan.id} />
          <DetailField
            label="Value limit"
            value={loan.valueLimit > 0 ? formatCurrency(loan.valueLimit) : '—'}
          />
          <DetailField label="Lent on" value={loan.startDate} />
          <DetailField
            label={loan.status === 'Pending' ? 'Disbursement due' : 'Interest due date'}
            value={due.dueDateLabel}
          />
          {dueSummary && (
            <DetailField label="Due status" value={dueSummary} full />
          )}
          <DetailField label="Interest collected" value={formatCurrency(loan.interestCollected)} />
          <DetailField label="Last payment" value={loan.lastPaymentDate ?? '—'} />
        </DetailGrid>
      </DetailSection>

      {loan.description.trim() !== '' && (
        <DetailSection title="Description">
          <SafeText as="p" className="detail-description">
            {loan.description}
          </SafeText>
        </DetailSection>
      )}

      {(loan.partnerShares ?? []).length > 0 && (
        <DetailSection title="Partners">
          <div className="link-card-list">
            {(loan.partnerShares ?? []).map((share) => {
              const partner = getPartner(share.partnerId)
              if (!partner) return null
              const principalShare = getPartnerDeployedOnLoan(loan, share)
              const partnerInterest = isActive
                ? calculatePartnerInterestOnLoan(loan, share)
                : 0

              return (
                <LinkCard
                  key={share.partnerId}
                  title={partner.name}
                  subtitle={`${formatCurrency(share.amount)} · ${formatShareRate(share)}`}
                  meta={
                    isActive && partnerInterest > 0
                      ? `${formatCurrency(partnerInterest)} int. due`
                      : isActive && principalShare > 0
                        ? `${formatCurrency(principalShare)} deployed`
                        : '—'
                  }
                  route={{ type: 'partner', id: partner.id }}
                />
              )
            })}
          </div>
        </DetailSection>
      )}

      {borrower && (
        <DetailSection title="Borrower">
          <LinkCard
            title={borrower.name}
            subtitle={borrower.phone}
            meta={formatCurrency(getBorrowerOutstanding(loans, borrower.id))}
            route={{ type: 'borrower', id: borrower.id }}
          />
        </DetailSection>
      )}

      {isActive && interestLogRows.length > 0 && (
        <DetailSection title="Interest">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {interestLogRows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Period">{row.periodLabel}</td>
                    <td data-label="Amount">{formatCurrency(row.amount)}</td>
                    <td data-label="Status">
                      <span className={`badge badge-${row.status === 'paid' ? 'paid' : 'due'}`}>
                        {row.status === 'paid' ? 'Paid' : 'Due'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailSection>
      )}

      <DetailSection title="Payments">
        {loanPayments.length === 0 ? (
          <p className="empty-inline">No payments</p>
        ) : (
          <div className="link-card-list">
            {loanPayments.map((p) => (
              <LinkCard
                key={p.id}
                title={getPaymentTypeLabel(p.type)}
                subtitle={`${p.date} · ${p.mode}`}
                meta={formatCurrency(p.amount)}
                route={{ type: 'payment', id: p.id }}
              />
            ))}
          </div>
        )}
      </DetailSection>

      <div className="detail-actions">
        {isActive && (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openPaymentForm({ loanId: loan.id, type: 'interest_only' })}
            >
              <BtnIcon icon="banknote">Pay interest</BtnIcon>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => openPaymentForm({ loanId: loan.id, type: 'full_settlement' })}
            >
              <BtnIcon icon="check-circle">Full settlement</BtnIcon>
            </button>
          </>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => openLoanForm({ mode: 'edit', loanId: loan.id })}
        >
          <BtnIcon icon="pencil">Edit loan</BtnIcon>
        </button>
        <button type="button" className="btn btn-danger" onClick={openDeleteConfirm}>
          <span className="btn-inner">
            <Icon name="trash" size={18} className="btn-inner-icon" />
            <span>Delete loan</span>
          </span>
        </button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete loan?"
        confirmLabel="Delete"
        cancelLabel="Keep"
        error={deleteError}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      >
        <div className="modal-summary">
          <strong>{formatCurrency(loan.principal)}</strong>
          <span>
            {loan.id}
            {borrower ? ` · ${borrower.name}` : ''}
          </span>
          {loanPayments.length > 0 && (
            <span>
              {loanPayments.length} payment{loanPayments.length === 1 ? '' : 's'} will also be
              deleted
            </span>
          )}
        </div>
      </ConfirmDialog>
    </div>
  )
}
