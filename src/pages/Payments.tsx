import { BtnIcon } from '../components/BtnIcon'
import { SafeText } from '../components/SafeText'
import { formatCurrency, getPaymentTypeLabel, getPortfolioStats } from '../data/helpers'
import { useNavigation } from '../context/NavigationContext'
import { useLoanBook } from '../context/LoanBookContext'
import { KpiCard } from '../components/KpiCard'

export function Payments() {
  const { openDetail, openPaymentForm } = useNavigation()
  const { payments, loans, getBorrower } = useLoanBook()
  const { collectedMtd } = getPortfolioStats(loans, payments)

  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return (
    <div className="page">
      <div className="page-actions page-actions--compact">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => openPaymentForm()}>
          <BtnIcon icon="wallet">Record payment</BtnIcon>
        </button>
      </div>

      <section className="kpi-grid kpi-grid--2">
        <KpiCard
          label="Collected this month"
          value={formatCurrency(collectedMtd)}
          variant="success"
        />
      </section>

      {sortedPayments.length === 0 ? (
        <p className="empty-inline">No payments</p>
      ) : (
        <ul className="compact-list">
          {sortedPayments.map((p) => {
            const borrower = getBorrower(p.borrowerId)
            const typeBadge =
              p.type === 'full_settlement' ? 'settlement' : 'interest'

            return (
              <li key={p.id}>
                <button
                  type="button"
                  className="compact-row"
                  onClick={() => openDetail({ type: 'payment', id: p.id })}
                >
                  <div className="compact-row-top">
                    <SafeText as="span" className="compact-row-id">
                      {p.id}
                    </SafeText>
                    <span className={`badge badge-${typeBadge}`}>
                      {getPaymentTypeLabel(p.type)}
                    </span>
                  </div>
                  <div className="compact-row-mid">
                    <SafeText as="span" className="compact-row-name">
                      {borrower?.name ?? '—'}
                    </SafeText>
                    <span className="compact-row-dot">·</span>
                    <span className="compact-row-days">{p.date}</span>
                    <span className="compact-row-dot">·</span>
                    <span className="compact-row-days">{p.mode}</span>
                  </div>
                  <div className="compact-row-bottom">
                    <SafeText variant="amount">{formatCurrency(p.amount)}</SafeText>
                    {p.type === 'interest_only' && p.interestAmount > 0 && (
                      <SafeText as="span" className="compact-row-interest" variant="amount">
                        {formatCurrency(p.interestAmount)} int.
                      </SafeText>
                    )}
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
