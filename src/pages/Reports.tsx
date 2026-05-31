import { useMemo, useState } from 'react'
import { ReportDonut } from '../components/reports/ReportDonut'
import { KpiCard } from '../components/KpiCard'
import { SafeText } from '../components/SafeText'
import { formatCurrency, getPortfolioStats } from '../data/helpers'
import {
  buildMonthReport,
  formatCollectionRate,
  parseMonthKey,
  resolveActiveReportMonthId,
  withCurrentMonthSummary,
} from '../data/reports'
import { useNavigation } from '../context/NavigationContext'
import { useLoanBook } from '../context/LoanBookContext'

export function Reports() {
  const { openDetail } = useNavigation()
  const { loans, payments, monthlySummaries, getBorrower } = useLoanBook()
  const stats = getPortfolioStats(loans, payments)

  const [pickedMonthId, setPickedMonthId] = useState<string | null>(null)

  const displaySummaries = useMemo(
    () => withCurrentMonthSummary(monthlySummaries),
    [monthlySummaries],
  )

  const activeMonthId = useMemo(
    () => resolveActiveReportMonthId(displaySummaries, pickedMonthId),
    [displaySummaries, pickedMonthId],
  )

  const selectedSummary = useMemo(
    () => displaySummaries.find((m) => m.id === activeMonthId),
    [displaySummaries, activeMonthId],
  )

  const monthReport = useMemo(() => {
    if (!selectedSummary) return null
    try {
      return buildMonthReport(loans, payments, selectedSummary)
    } catch {
      return null
    }
  }, [loans, payments, selectedSummary])

  const interestPrincipalSlices = useMemo(() => {
    if (!monthReport || monthReport.totalCollected <= 0) return []
    return [
      {
        id: 'interest',
        label: 'Interest',
        value: monthReport.interestCollected,
        color: 'var(--interest)',
      },
      {
        id: 'principal',
        label: 'Principal',
        value: monthReport.principalRecovered,
        color: 'var(--accent-hover)',
      },
    ].filter((s) => s.value > 0)
  }, [monthReport])

  if (monthlySummaries.length === 0) {
    return (
      <div className="page reports-page">
        <section className="kpi-grid kpi-grid--2">
          <KpiCard label="Principal outstanding" value={formatCurrency(stats.principalDue)} variant="accent" />
          <KpiCard
            label="Interest outstanding"
            value={formatCurrency(stats.interestDue)}
            variant="interest"
          />
        </section>
        <section className="panel">
          <h2>Reports</h2>
          <p className="empty-inline">No payments yet</p>
        </section>
      </div>
    )
  }

  if (!selectedSummary) {
    return (
      <div className="page reports-page">
        <p className="empty-inline">Loading reports…</p>
      </div>
    )
  }

  const report = monthReport ?? {
    ...selectedSummary,
    collectionRate: null as number | null,
    interestDueAtMonthStart: 0,
    uniqueBorrowers: 0,
    averagePayment: 0,
    interestSharePct: 0,
    principalSharePct: 0,
    byMode: [],
    byType: [],
    topBorrowers: [],
    payments: [],
    year: parseMonthKey(selectedSummary.id)?.year ?? new Date().getFullYear(),
    month: parseMonthKey(selectedSummary.id)?.month ?? new Date().getMonth(),
  }

  return (
    <div className="page reports-page">
      <section className="kpi-grid kpi-grid--2">
        <KpiCard label="Principal outstanding" value={formatCurrency(stats.principalDue)} variant="accent" />
        <KpiCard
          label="Interest outstanding"
          value={formatCurrency(stats.interestDue)}
          variant="interest"
        />
      </section>

      <section className="panel report-month-picker">
        <h2>Month</h2>
        <div className="report-month-chips" role="tablist" aria-label="Select month">
          {displaySummaries.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={m.id === activeMonthId}
              className={`report-month-chip${m.id === activeMonthId ? ' active' : ''}`}
              onClick={() => setPickedMonthId(m.id)}
            >
              {m.title.replace(/\s+\d{4}$/, '')}
              <span className="report-month-chip-year">
                {parseMonthKey(m.id)?.year ?? ''}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="kpi-grid kpi-grid--4">
        <KpiCard label="Collected" value={formatCurrency(report.totalCollected)} variant="success" />
        <KpiCard
          label="Interest collected"
          value={formatCurrency(report.interestCollected)}
          variant="interest"
        />
        <KpiCard
          label="Principal recovered"
          value={formatCurrency(report.principalRecovered)}
          variant="accent"
        />
        <KpiCard label="Collection rate" value={formatCollectionRate(report.collectionRate)} />
      </section>

      {interestPrincipalSlices.length > 0 && (
        <div className="report-charts-grid">
          <ReportDonut title="Interest vs principal" slices={interestPrincipalSlices} />
        </div>
      )}

      <section className="panel">
        <h2>Month snapshot</h2>
        <dl className="report-stats-grid">
          <div>
            <dt>Payments</dt>
            <dd>{report.paymentCount}</dd>
          </div>
          <div>
            <dt>Borrowers paid</dt>
            <dd>{report.uniqueBorrowers}</dd>
          </div>
          <div>
            <dt>Average payment</dt>
            <dd>{formatCurrency(report.averagePayment)}</dd>
          </div>
          <div>
            <dt>Full settlements</dt>
            <dd>{report.fullSettlements}</dd>
          </div>
          <div>
            <dt>Interest share</dt>
            <dd>{report.interestSharePct}%</dd>
          </div>
          <div>
            <dt>Principal share</dt>
            <dd>{report.principalSharePct}%</dd>
          </div>
        </dl>
      </section>

      {report.topBorrowers.length > 0 && (
        <section className="panel">
          <h2>Top payers</h2>
          <ul className="compact-list">
            {report.topBorrowers.map((row) => {
              const name = getBorrower(row.borrowerId)?.name ?? row.borrowerId
              return (
                <li key={row.borrowerId}>
                  <button
                    type="button"
                    className="compact-row"
                    onClick={() => openDetail({ type: 'borrower', id: row.borrowerId })}
                  >
                    <div className="compact-row-top">
                      <SafeText as="span" className="compact-row-name">
                        {name}
                      </SafeText>
                      <span className="compact-row-meta">{formatCurrency(row.amount)}</span>
                    </div>
                    <div className="compact-row-bottom">
                      <span className="compact-row-muted">
                        {row.paymentCount} payment{row.paymentCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="panel">
        <h2>All months</h2>
        <div className="link-card-list">
          {displaySummaries.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`link-card pressable${m.id === activeMonthId ? ' link-card--active' : ''}`}
              onClick={() => setPickedMonthId(m.id)}
            >
              <div className="link-card-body">
                <strong>{m.title}</strong>
                <span>
                  {m.paymentCount} payments · {formatCurrency(m.interestCollected)} interest
                </span>
              </div>
              <span className="link-card-meta">{formatCurrency(m.totalCollected)}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm report-open-detail"
          onClick={() => openDetail({ type: 'report', id: selectedSummary.id })}
        >
          Open {selectedSummary.title} details
        </button>
      </section>
    </div>
  )
}
