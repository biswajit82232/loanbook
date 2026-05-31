interface CountBadgeProps {
  count: number
  /** Shown when count exceeds cap (default 99 → "99+") */
  cap?: number
  className?: string
  /** Accessible name, e.g. "5 loans" */
  label?: string
}

export function CountBadge({ count, cap = 99, className = '', label }: CountBadgeProps) {
  const display = count > cap ? `${cap}+` : String(count)
  const aria = label ?? `${count} items`

  return (
    <span
      className={`count-badge ${className}`.trim()}
      aria-label={aria}
      title={aria}
    >
      {display}
    </span>
  )
}
