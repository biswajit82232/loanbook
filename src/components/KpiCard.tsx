interface KpiCardProps {
  label: string
  value: string | number
  variant?: 'default' | 'accent' | 'interest' | 'success'
}

export function KpiCard({ label, value, variant = 'default' }: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-card--${variant}`}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
    </article>
  )
}
