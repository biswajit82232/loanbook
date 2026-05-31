import type { ReactNode } from 'react'

export function DetailSection({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="panel detail-section">
      <div className="section-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="detail-grid">{children}</dl>
}

export function DetailField({
  label,
  value,
  full,
}: {
  label: string
  value: ReactNode
  full?: boolean
}) {
  return (
    <div className={`detail-field ${full ? 'full' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
