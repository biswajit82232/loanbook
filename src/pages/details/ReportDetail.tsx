import { useMemo } from 'react'
import { ReportDonut } from '../../components/reports/ReportDonut'
import { KpiCard } from '../../components/KpiCard'
import { SafeText } from '../../components/SafeText'
import { formatCurrency, parseAppDate } from '../../data/helpers'
import { buildMonthReport, formatCollectionRate } from '../../data/reports'
import { useNavigation } from '../../context/NavigationContext'
import { useLoanBook } from '../../context/LoanBookContext'
import { LinkCard } from '../../components/LinkCard'

export function ReportDetail({ id }: { id: string }) {
  const { openDetail } = useNavigation()
  const { loans, payments, getMonthSummary, getBorrower } = useLoanBook()
  const summary = getMonthSummary(id)

  const monthReport = useMemo(() => {
    if (!summary) return null
    return buildMonthReport(loans, payments, summary)
  }, [loans, payments, summary])

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

  if (!monthReport || !summary) {
    return <p className="empty-state">Report not found.</p>
  }

  return (
    <div className="page detail-page reports-detail-page">
      <div className="detail-hero">
        <p className="detail-hero-amount">{summary.title}</p>
        <p className="detail-hero-sub">{summary.paymentCount} payments</p>
      </div>

      <section className="kpi-grid kpi-grid--4">
        <KpiCard label="Collected" value={formatCurrency(monthReport.totalCollected)} variant="success" />
        <KpiCard
          label="Interest"
          value={formatCurrency(monthReport.interestCollected)}
          variant="interest"
        />
        <KpiCard
          label="Principal"
          value={formatCurrency(monthReport.principalRecovered)}
          variant="accent"
        />
        <KpiCard
          label="Collection rate"
          value={formatCollectionRate(monthReport.collectionRate)}
        />
      </section>

      {interestPrincipalSlices.length > 0 && (
        <div className="report-charts-grid">
          <ReportDonut title="Interest vs principal" slices={interestPrincipalSlices} />
        </div>
      )}

      {monthReport.payments.length > 0 && (
        <section className="panel">
          <h2>Payments this month</h2>
          <div className="link-card-list">
            {monthReport.payments
              .sort(
                (a, b) =>
                  (parseAppDate(b.date)?.getTime() ?? 0) - (parseAppDate(a.date)?.getTime() ?? 0),
              )
              .map((p) => (
                <LinkCard
                  key={p.id}
                  title={p.type === 'full_settlement' ? 'Full settlement' : 'Interest'}
                  subtitle={`${p.date} · ${p.mode}`}
                  meta={formatCurrency(p.amount)}
                  route={{ type: 'payment', id: p.id }}
                />
              ))}
          </div>
        </section>
      )}

      {monthReport.topBorrowers.length > 0 && (
        <section className="panel">
          <h2>Top payers</h2>
          <ul className="compact-list">
            {monthReport.topBorrowers.map((row) => (
              <li key={row.borrowerId}>
                <button
                  type="button"
                  className="compact-row"
                  onClick={() => openDetail({ type: 'borrower', id: row.borrowerId })}
                >
                  <div className="compact-row-top">
                    <SafeText as="span" className="compact-row-name">
                      {getBorrower(row.borrowerId)?.name ?? row.borrowerId}
                    </SafeText>
                    <span className="compact-row-meta">{formatCurrency(row.amount)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
