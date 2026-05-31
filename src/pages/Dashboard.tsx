import { useMemo } from 'react'
import { Icon } from '../components/icons'
import { useNavigation } from '../context/NavigationContext'
import { useLoanBook } from '../context/LoanBookContext'
import { KpiCard } from '../components/KpiCard'
import { SafeText } from '../components/SafeText'
import {
  compareLoanByStartDateNewest,
  formatCurrency,
  formatDaysLent,
  getBuiltUpInterest,
  getLoanLentDays,
  getLoanListAmountLabel,
  getPaymentTypeLabel,
  getPortfolioStats,
  parseAppDate,
} from '../data/helpers'
import { dueStatusBadgeClass, formatDueSummary, getLoanDueInfo } from '../data/loan-due'
import {
  getDashboardAttentionItems,
  type DashboardAttentionItem,
} from '../data/reminders'

function attentionKindLabel(kind: DashboardAttentionItem['kind']) {
  switch (kind) {
    case 'value_limit':
      return 'Near limit'
    case 'payment_due':
      return 'Overdue'
    case 'payment_due_soon':
      return 'Due soon'
    case 'pending_loan':
      return 'Pending'
    default:
      return 'Attention'
  }
}

export function Dashboard() {
  const { openDetail, setPage } = useNavigation()
  const { loans, payments, settings, getBorrower, dismissAttention } = useLoanBook()
  const stats = getPortfolioStats(loans, payments)

  const attentionItems = useMemo(
    () =>
      getDashboardAttentionItems(
        loans,
        new Set(settings.attentionDismissed),
        (borrowerId) => getBorrower(borrowerId)?.name ?? '',
        new Date(),
        settings.reminderPeriodDays,
      ),
    [loans, settings.attentionDismissed, settings.reminderPeriodDays, getBorrower],
  )

  const hasCriticalAttention = attentionItems.some((item) => item.kind === 'value_limit')

  const newestLoans = useMemo(
    () => [...loans].sort(compareLoanByStartDateNewest).slice(0, 3),
    [loans],
  )

  const recentPayments = [...payments]
    .sort((a, b) => {
      const ta = parseAppDate(a.date)?.getTime() ?? 0
      const tb = parseAppDate(b.date)?.getTime() ?? 0
      return tb - ta || b.id.localeCompare(a.id)
    })
    .slice(0, 10)

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
            <span
              className={`attention-count${hasCriticalAttention ? ' attention-count--critical' : ''}`}
              aria-label={`${attentionItems.length} items`}
            >
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
              const typeBadge =
                item.kind === 'value_limit'
                  ? 'danger'
                  : item.kind === 'payment_due'
                    ? 'due'
                    : item.kind === 'payment_due_soon'
                      ? 'due-soon'
                      : 'pending'
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
                      onClick={() => dismissAttention(item.dismissKey!)}
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
        <header className="attention-panel-head">
          <h2>Newest loans</h2>
          {loans.length > 3 && (
            <button type="button" className="panel-inline-link" onClick={() => setPage('loans')}>
              View all
            </button>
          )}
        </header>
        {newestLoans.length === 0 ? (
          <p className="empty-inline">No loans</p>
        ) : (
          <ul className="compact-list dashboard-loan-list">
            {newestLoans.map((loan) => {
              const borrower = getBorrower(loan.borrowerId)
              const days = formatDaysLent(getLoanLentDays(loan), loan)
              const interest = loan.status === 'Active' ? getBuiltUpInterest(loan) : 0
              const due = getLoanDueInfo(loan, new Date(), settings.reminderPeriodDays)
              const dueSummary = formatDueSummary(due)
              const showDueBadge =
                due.status === 'overdue' || due.status === 'due_soon' || due.status === 'scheduled'

              return (
                <li key={loan.id}>
                  <button
                    type="button"
                    className="compact-row"
                    onClick={() => openDetail({ type: 'loan', id: loan.id })}
                  >
                    <div className="compact-row-top">
                      <SafeText as="span" className="compact-row-id">
                        {loan.id}
                      </SafeText>
                      <span className="compact-row-badges">
                        {showDueBadge && due.status !== 'upcoming' && (
                          <span className={`badge badge-${dueStatusBadgeClass(due.status)}`}>
                            {due.statusLabel}
                          </span>
                        )}
                        <span className={`badge badge-${loan.status.toLowerCase()}`}>
                          {loan.status}
                        </span>
                      </span>
                    </div>
                    <div className="compact-row-mid">
                      <SafeText as="span" className="compact-row-name">
                        {borrower?.name ?? '—'}
                      </SafeText>
                      {dueSummary ? (
                        <>
                          <span className="compact-row-dot">·</span>
                          <span className="compact-row-days">{dueSummary}</span>
                        </>
                      ) : (
                        days !== '—' && (
                          <>
                            <span className="compact-row-dot">·</span>
                            <span className="compact-row-days">{days}</span>
                          </>
                        )
                      )}
                    </div>
                    <div className="compact-row-bottom">
                      <SafeText as="span" className="compact-row-principal" variant="amount">
                        {getLoanListAmountLabel(loan)}
                        {loan.status !== 'Pending' && (
                          <span className="compact-row-principal-label"> lent</span>
                        )}
                      </SafeText>
                      {loan.status === 'Active' && interest > 0 && (
                        <SafeText as="span" className="compact-row-interest" variant="amount">
                          · {formatCurrency(interest)} int.
                        </SafeText>
                      )}
                    </div>
                  </button>
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
