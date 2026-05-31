import { Icon } from '../components/icons'
import { useNavigation } from '../context/NavigationContext'
import { useLoanBook } from '../context/LoanBookContext'
import { KpiCard } from '../components/KpiCard'
import { formatCurrency, getPaymentTypeLabel, getPortfolioStats } from '../data/helpers'

export function Dashboard() {
  const { openDetail } = useNavigation()
  const { loans, payments } = useLoanBook()
  const stats = getPortfolioStats(loans, payments)
  const recentPayments = [...payments]
    .sort((a, b) => {
      const ta = new Date(a.date).getTime()
      const tb = new Date(b.date).getTime()
      return tb - ta || b.id.localeCompare(a.id)
    })
    .slice(0, 5)

  return (
    <div className="page">
      <section className="kpi-grid">
        <KpiCard label="Active loans" value={stats.activeLoans} />
        <KpiCard label="Principal out" value={formatCurrency(stats.principalDue)} variant="accent" />
        <KpiCard label="Interest due" value={formatCurrency(stats.interestDue)} variant="interest" />
        <KpiCard label="Collected this month" value={formatCurrency(stats.collectedMtd)} variant="success" />
      </section>

      <section className="panel panel--flush-list">
        <h2>Recent payments</h2>
        {recentPayments.length === 0 ? (
          <p className="empty-inline">No payments yet.</p>
        ) : (
          <ul className="activity-list">
            {recentPayments.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="activity-item"
                  onClick={() => openDetail({ type: 'payment', id: p.id })}
                >
                  <span className="activity-icon activity-icon--collected" aria-hidden>
                    <Icon name="receipt" size={18} />
                  </span>
                  <div>
                    <strong>{getPaymentTypeLabel(p.type)}</strong>
                    <span>
                      {formatCurrency(p.amount)} · {p.date}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
