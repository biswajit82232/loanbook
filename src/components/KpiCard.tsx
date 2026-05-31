import { SafeText } from './SafeText'

interface KpiCardProps {
  label: string
  value: string | number
  variant?: 'default' | 'accent' | 'interest' | 'success'
}

export function KpiCard({ label, value, variant = 'default' }: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-card--${variant}`}>
      <p className="kpi-label text-safe">{label}</p>
      <SafeText as="p" className="kpi-value" variant="amount">
        {value}
      </SafeText>
    </article>
  )
}
