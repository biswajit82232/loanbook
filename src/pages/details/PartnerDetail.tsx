import {
  calculatePartnerInterestOnLoan,
  formatCurrency,
  getLoansForPartner,
  getPartnerInterestDue,
  getPartnerPrincipalDeployed,
  formatShareRate,
  getPartnerDeployedOnLoan,
} from '../../data/helpers'
import { formatDisplayPhone } from '../../utils/phone'
import { BtnIcon } from '../../components/BtnIcon'
import { useNavigation } from '../../context/NavigationContext'
import { useLoanBook } from '../../context/LoanBookContext'
import { KpiCard } from '../../components/KpiCard'
import { DetailField, DetailGrid, DetailSection } from '../../components/DetailSection'
import { LinkCard } from '../../components/LinkCard'

export function PartnerDetail({ id }: { id: string }) {
  const { openPartnerForm } = useNavigation()
  const { getPartner, loans, getBorrower } = useLoanBook()
  const partner = getPartner(id)

  if (!partner) {
    return <p className="empty-state">Partner not found.</p>
  }

  const partnerLoans = getLoansForPartner(partner.id, loans)
  const deployed = getPartnerPrincipalDeployed(partner.id, loans)
  const interestDue = getPartnerInterestDue(partner.id, loans, getPartner)

  return (
    <div className="page detail-page">
      <div className="detail-hero borrower-hero">
        <div className="avatar avatar-lg">{partner.name.charAt(0)}</div>
        <div className="detail-hero-text">
          <p className="detail-hero-amount">{partner.name}</p>
          <p
            className={`detail-hero-sub${!partner.phone.trim() ? ' detail-hero-sub--muted' : ''}`}
          >
            {formatDisplayPhone(partner.phone)}
          </p>
        </div>
      </div>

      <section className="kpi-grid kpi-grid--2">
        <KpiCard label="Principal deployed" value={formatCurrency(deployed)} variant="accent" />
        <KpiCard label="Interest due" value={formatCurrency(interestDue)} variant="interest" />
      </section>

      <DetailSection title="Details">
        <DetailGrid>
          <DetailField label="Partner ID" value={partner.id} />
          <DetailField label="Status" value={partner.status} />
          <DetailField label="Notes" value={partner.notes || '—'} full />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Loans">
        {partnerLoans.length === 0 ? (
          <p className="empty-inline">No loans</p>
        ) : (
          <div className="link-card-list">
            {partnerLoans.map((loan) => {
              const share = (loan.partnerShares ?? []).find((s) => s.partnerId === partner.id)
              const principalShare = share ? getPartnerDeployedOnLoan(loan, share) : 0
              const loanInterest =
                loan.status === 'Active' && share
                  ? calculatePartnerInterestOnLoan(loan, share)
                  : 0
              const borrower = getBorrower(loan.borrowerId)

              return (
                <LinkCard
                  key={loan.id}
                  title={`${loan.id} · ${share ? formatCurrency(share.amount) : '—'}`}
                  subtitle={[
                    share ? formatShareRate(share) : '',
                    borrower?.name ?? '',
                    loan.purpose ?? '',
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                  meta={
                    loan.status === 'Active'
                      ? share && share.amount <= 0 && loanInterest > 0
                        ? `${formatCurrency(loanInterest)} int. due`
                        : `${formatCurrency(principalShare)} · ${formatCurrency(loanInterest)} due`
                      : loan.status
                  }
                  route={{ type: 'loan', id: loan.id }}
                />
              )
            })}
          </div>
        )}
      </DetailSection>

      <div className="detail-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openPartnerForm({ mode: 'edit', partnerId: partner.id })}
        >
          <BtnIcon icon="pencil">Edit partner</BtnIcon>
        </button>
      </div>
    </div>
  )
}
