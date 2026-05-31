import { Icon } from '../components/icons'
import { KpiCard } from '../components/KpiCard'
import { formatCurrency, getPortfolioStats } from '../data/helpers'
import { useNavigation } from '../context/NavigationContext'
import { useLoanBook } from '../context/LoanBookContext'

export function Reports() {
  const { openDetail } = useNavigation()
  const { loans, payments, monthlySummaries } = useLoanBook()
  const stats = getPortfolioStats(loans, payments)

  return (
    <div className="page">
      <section className="kpi-grid kpi-grid--2">
        <KpiCard label="Principal outstanding" value={formatCurrency(stats.principalDue)} variant="accent" />
        <KpiCard
          label="Borrower interest"
          value={formatCurrency(stats.interestDue)}
          variant="interest"
        />
      </section>

      <section className="panel">
        <h2>By month</h2>
        {monthlySummaries.length === 0 ? (
          <p className="empty-inline">No payments</p>
        ) : (
          <div className="link-card-list">
            {monthlySummaries.map((m) => (
              <button
                key={m.id}
                type="button"
                className="link-card"
                onClick={() => openDetail({ type: 'report', id: m.id })}
              >
                <div className="link-card-body">
                  <strong>{m.title}</strong>
                  <span>{m.paymentCount} payments</span>
                </div>
                <span className="link-card-meta">{formatCurrency(m.totalCollected)}</span>
                <Icon name="chevron-right" size={20} className="link-card-chevron" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
