import { useMemo } from 'react'
import { Icon } from '../components/icons'
import { useNavigation } from '../context/NavigationContext'
import { useLoanBook } from '../context/LoanBookContext'
import { KpiCard } from '../components/KpiCard'
import { SafeText } from '../components/SafeText'
import { formatCurrency, getPaymentTypeLabel, getPortfolioStats, parseAppDate } from '../data/helpers'
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
      const ta = parseAppDate(a.date)?.getTime() ?? 0
      const tb = parseAppDate(b.date)?.getTime() ?? 0
      return tb - ta || b.id.localeCompare(a.id)
    })
    .slice(0, 5)

  return (
    <div className="page">
      <section className="kpi-grid kpi-grid--2">
        <KpiCard label="Principal out" value={formatCurrency(stats.principalDue)} variant="accent" />
        <KpiCard
          label="Borrower interest"
          value={formatCurrency(stats.interestDue)}
          variant="interest"
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
          <p className="attention-empty">
            <Icon name="check-circle" size={16} aria-hidden />
            <span>All caught up</span>
          </p>
        ) : (
          <ul className="compact-list attention-list">
            {attentionItems.map((item) => {
              const typeBadge = item.kind === 'payment_due' ? 'due' : 'pending'
              return (
                <li key={item.id} className="attention-list-item">
                  <button
                    type="button"
                    className={`compact-row attention-row attention-row--${typeBadge}`}
                    onClick={() => openDetail({ type: 'loan', id: item.loanId })}
                  >
                    <div className="compact-row-top">
                      <SafeText as="span" className="compact-row-id">
                        {item.borrowerName}
                      </SafeText>
                      <span className={`badge badge-${typeBadge}`}>
                        {attentionKindLabel(item.kind)}
                      </span>
                    </div>
                    <div className="compact-row-mid">
                      <span>{item.reason}</span>
                      <span className="compact-row-dot">·</span>
                      <span className="compact-row-days">{item.context}</span>
                    </div>
                    <div className="compact-row-bottom">
                      <SafeText variant="amount">{formatCurrency(item.amount)}</SafeText>
                      <span className="compact-row-interest">{item.amountCaption}</span>
                    </div>
                  </button>
                  {item.dismissKey && (
                    <button
                      type="button"
                      className="attention-row-dismiss"
                      onClick={() => dismissReminder(item.dismissKey!)}
                      aria-label={`Dismiss reminder for ${item.borrowerName}`}
                      title="Dismiss"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </li>
              )
            })}
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
                    <Icon name="banknote" size={18} />
                  </span>
                  <div>
                    <SafeText as="strong">{getPaymentTypeLabel(p.type)}</SafeText>
                    <SafeText as="span" variant="amount">
                      {formatCurrency(p.amount)} · {p.date}
                    </SafeText>
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
