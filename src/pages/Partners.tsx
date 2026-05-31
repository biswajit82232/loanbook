import { CountBadge } from '../components/CountBadge'
import { SafeText } from '../components/SafeText'
import {
  formatCurrency,
  getLoansForPartner,
  getPartnerInterestDue,
  getPartnerPortfolioStats,
  getPartnerPrincipalDeployed,
} from '../data/helpers'
import { formatDisplayPhone } from '../utils/phone'
import { BtnIcon } from '../components/BtnIcon'
import { useNavigation } from '../context/NavigationContext'
import { useLoanBook } from '../context/LoanBookContext'
import { KpiCard } from '../components/KpiCard'

export function Partners() {
  const { openDetail, openPartnerForm } = useNavigation()
  const { partners, loans } = useLoanBook()
  const stats = getPartnerPortfolioStats(partners, loans)

  return (
    <div className="page">
      <div className="page-actions page-actions--compact">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => openPartnerForm({ mode: 'create' })}
        >
          <BtnIcon icon="plus">Add partner</BtnIcon>
        </button>
      </div>

      <section className="kpi-grid kpi-grid--2">
        <KpiCard label="Deployed" value={formatCurrency(stats.totalDeployed)} variant="accent" />
        <KpiCard
          label="Partner interest"
          value={formatCurrency(stats.totalInterestDue)}
          variant="interest"
        />
      </section>

      {partners.length === 0 ? (
        <p className="empty-inline">No partners</p>
      ) : (
        <ul className="compact-list">
          {partners.map((partner) => {
            const deployed = getPartnerPrincipalDeployed(partner.id, loans)
            const interestDue = getPartnerInterestDue(partner.id, loans)
            const partnerLoanCount = getLoansForPartner(partner.id, loans).length

            return (
              <li key={partner.id}>
                <button
                  type="button"
                  className="compact-row"
                  onClick={() => openDetail({ type: 'partner', id: partner.id })}
                >
                  <div className="compact-row-top">
                    <span className="compact-row-title-group">
                      <SafeText as="span" className="compact-row-id">
                        {partner.name}
                      </SafeText>
                      {partnerLoanCount > 0 && (
                        <CountBadge
                          count={partnerLoanCount}
                          label={`${partnerLoanCount} loan${partnerLoanCount === 1 ? '' : 's'}`}
                        />
                      )}
                    </span>
                    <span className={`badge badge-${partner.status.toLowerCase()}`}>
                      {partner.status}
                    </span>
                  </div>
                  <div className="compact-row-mid">
                    <span className="compact-row-name">{formatDisplayPhone(partner.phone)}</span>
                    <span className="compact-row-dot">·</span>
                    <span className="compact-row-days">{partner.id}</span>
                  </div>
                  <div className="compact-row-bottom">
                    <SafeText variant="amount">{formatCurrency(deployed)} deployed</SafeText>
                    <SafeText as="span" className="compact-row-interest" variant="amount">
                      {formatCurrency(interestDue)} due
                    </SafeText>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
