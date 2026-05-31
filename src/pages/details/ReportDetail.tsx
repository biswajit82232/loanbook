import { formatCurrency } from '../../data/helpers'
import { useLoanBook } from '../../context/LoanBookContext'
import { KpiCard } from '../../components/KpiCard'
import { DetailField, DetailGrid, DetailSection } from '../../components/DetailSection'

export function ReportDetail({ id }: { id: string }) {
  const { getMonthSummary } = useLoanBook()
  const month = getMonthSummary(id)

  if (!month) {
    return <p className="empty-state">Report not found.</p>
  }

  return (
    <div className="page detail-page">
      <div className="detail-hero">
        <p className="detail-hero-amount">{month.title}</p>
        <p className="detail-hero-sub">{month.paymentCount} payments</p>
      </div>

      <section className="kpi-grid kpi-grid--2">
        <KpiCard label="Interest" value={formatCurrency(month.interestCollected)} variant="interest" />
        <KpiCard label="Principal" value={formatCurrency(month.principalRecovered)} variant="accent" />
      </section>

      <DetailSection title="Summary">
        <DetailGrid>
          <DetailField label="Total collected" value={formatCurrency(month.totalCollected)} />
          <DetailField label="Full settlements" value={month.fullSettlements} />
        </DetailGrid>
      </DetailSection>
    </div>
  )
}
