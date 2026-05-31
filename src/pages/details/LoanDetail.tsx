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
import { useNavigation } from '../../context/NavigationContext'
import { useLoanBook } from '../../context/LoanBookContext'
import { DetailField, DetailGrid, DetailSection } from '../../components/DetailSection'
import { KpiCard } from '../../components/KpiCard'
import { LinkCard } from '../../components/LinkCard'

export function LoanDetail({ id }: { id: string }) {
  const { openPaymentForm, openLoanForm } = useNavigation()
  const { getLoan, getBorrower, getPartner, getPaymentsByLoan, loans } = useLoanBook()
  const loan = getLoan(id)

  if (!loan) {
    return <p className="empty-state">Loan not found.</p>
  }

  const borrower = getBorrower(loan.borrowerId)
  const loanPayments = getPaymentsByLoan(loan.id)
  const builtUpInterest = getBuiltUpInterest(loan)
  const totalDue = getLoanTotalDue(loan)
  const isActive = loan.status === 'Active'
  const daysLent = getLoanLentDays(loan)
  const interestLogRows = getInterestLogForDisplay(loan)

  return (
    <div className="page detail-page">
      <div className="detail-hero">
        <span className={`badge badge-${loan.status.toLowerCase()}`}>{loan.status}</span>
        <p className="detail-hero-amount">{formatCurrency(loan.principal)}</p>
        <p className="detail-hero-sub">
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
          <DetailField label="Lent on" value={loan.startDate} />
          <DetailField label="Interest collected" value={formatCurrency(loan.interestCollected)} />
          <DetailField label="Last payment" value={loan.lastPaymentDate ?? '—'} />
        </DetailGrid>
      </DetailSection>

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
                    isActive
                      ? `${formatCurrency(principalShare)} · ${formatCurrency(partnerInterest)} due`
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
          <p className="empty-inline">No payments.</p>
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
      </div>
    </div>
  )
}
