import { useMemo } from 'react'
import { Icon } from '../components/icons'
import { useNavigation } from '../context/NavigationContext'
import { useLoanBook } from '../context/LoanBookContext'
import { KpiCard } from '../components/KpiCard'
import { formatCurrency, getPaymentTypeLabel, getPortfolioStats } from '../data/helpers'
import {
  getDashboardAttentionItems,
  type DashboardAttentionItem,
} from '../data/reminders'

function attentionKindLabel(kind: DashboardAttentionItem['kind']) {
  return kind === 'payment_due' ? 'Interest due' : 'Pending loan'
}

export function Dashboard() {
  const { openDetail } = useNavigation()
  const { loans, payments, settings, getBorrower, dismissReminder } = useLoanBook()
  const stats = getPortfolioStats(loans, payments)

  const attentionItems = useMemo(
    () =>
      getDashboardAttentionItems(
        loans,
        new Set(settings.reminderDismissed),
        (borrowerId) => getBorrower(borrowerId)?.name ?? '',
      ),
    [loans, settings.reminderDismissed, getBorrower],
  )

  const recentPayments = [...payments]
    .sort((a, b) => {
      const ta = new Date(a.date).getTime()
      const tb = new Date(b.date).getTime()
      return tb - ta || b.id.localeCompare(a.id)
    })
    .slice(0, 5)

  return (
    <div className="page">
      <section className="kpi-grid kpi-grid--3">
        <KpiCard label="Principal out" value={formatCurrency(stats.principalDue)} variant="accent" />
        <KpiCard
          label="Borrower interest"
          value={formatCurrency(stats.interestDue)}
          variant="interest"
        />
        <KpiCard
          label="Collected this month"
          value={formatCurrency(stats.collectedMtd)}
          variant="success"
        />
      </section>

      <section className="panel attention-panel">
        <header className="attention-panel-head">
          <h2>Needs attention</h2>
          {attentionItems.length > 0 && (
            <span className="attention-count" aria-label={`${attentionItems.length} items`}>
              {attentionItems.length}
            </span>
          )}
        </header>

        {attentionItems.length === 0 ? (
          <div className="attention-empty">
            <span className="attention-empty-icon" aria-hidden>
              <Icon name="check-circle" size={24} />
            </span>
            <p className="attention-empty-title">All caught up</p>
          </div>
        ) : (
          <ul className="attention-cards">
            {attentionItems.map((item) => (
              <li key={item.id}>
                <article
                  className={`attention-card attention-card--${item.kind === 'payment_due' ? 'due' : 'pending'}`}
                >
                  {item.dismissKey && (
                    <button
                      type="button"
                      className="attention-card-dismiss"
                      onClick={() => dismissReminder(item.dismissKey!)}
                      aria-label={`Dismiss reminder for ${item.borrowerName}`}
                      title="Dismiss"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="attention-card-body"
                    onClick={() => openDetail({ type: 'loan', id: item.loanId })}
                  >
                    <div className="attention-card-meta-row">
                      <span
                        className={`attention-card-badge attention-card-badge--${item.kind === 'payment_due' ? 'due' : 'pending'}`}
                      >
                        {attentionKindLabel(item.kind)}
                      </span>
                      <Icon name="chevron-right" size={18} className="attention-card-chevron" />
                    </div>

                    <h3 className="attention-card-name">{item.borrowerName}</h3>
                    <p className="attention-card-reason">{item.reason}</p>
                    <p className="attention-card-context">{item.context}</p>

                    <div className="attention-card-amount-block">
                      <span className="attention-card-amount">{formatCurrency(item.amount)}</span>
                      <span className="attention-card-amount-caption">{item.amountCaption}</span>
                    </div>
                  </button>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel panel--flush-list">
        <h2>Recent payments</h2>
        {recentPayments.length === 0 ? (
          <p className="empty-inline">No payments</p>
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
