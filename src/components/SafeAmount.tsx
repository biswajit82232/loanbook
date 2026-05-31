import type { ElementType } from 'react'
import { formatCurrency } from '../data/helpers'
import { SafeText } from './SafeText'

export function SafeAmount({
  amount,
  className,
  as: Tag = 'span',
}: {
  amount: number
  className?: string
  as?: ElementType
}) {
  const label = formatCurrency(amount)
  return (
    <SafeText as={Tag} variant="amount" className={className}>
      {label}
    </SafeText>
  )
}
