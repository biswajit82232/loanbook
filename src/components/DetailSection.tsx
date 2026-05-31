import type { ReactNode } from 'react'
import { CountBadge } from './CountBadge'
import { SafeAmount } from './SafeAmount'
import { SafeText } from './SafeText'

export function DetailSection({
  title,
  count,
  countLabel,
  children,
  action,
}: {
  title: string
  /** Optional total shown in a small circle beside the section title */
  count?: number
  countLabel?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="panel detail-section">
      <div className="section-head">
        <h2 className="section-title-with-count">
          <SafeText as="span">{title}</SafeText>
          {count !== undefined && (
            <CountBadge count={count} label={countLabel ?? `${count} items`} />
          )}
        </h2>
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
      <dd>
        {typeof value === 'number' ? (
          <SafeAmount amount={value} />
        ) : typeof value === 'string' ? (
          <SafeText>{value}</SafeText>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
