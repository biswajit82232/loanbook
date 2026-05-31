import type { ElementType, ReactNode } from 'react'

type SafeTextProps = {
  children: ReactNode
  as?: ElementType
  className?: string
  /** Use for currency / numeric display strings */
  variant?: 'text' | 'amount'
  /** Native tooltip with full value (default on) */
  showTitle?: boolean
}

export function SafeText({
  children,
  as: Tag = 'span',
  className = '',
  variant = 'text',
  showTitle = true,
}: SafeTextProps) {
  const base = variant === 'amount' ? 'amount-text' : 'text-safe'
  const text = typeof children === 'string' || typeof children === 'number' ? String(children) : ''
  const title = showTitle && text ? text : undefined

  return (
    <Tag className={`${base}${className ? ` ${className}` : ''}`} title={title}>
      {children}
    </Tag>
  )
}
