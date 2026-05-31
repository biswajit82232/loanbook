import type { ReactNode } from 'react'
import type { IconName } from './icons'
import { Icon } from './icons'

interface BtnIconProps {
  icon: IconName
  children: ReactNode
  className?: string
}

/** Primary/secondary button with a leading icon */
export function BtnIcon({ icon, children, className = '' }: BtnIconProps) {
  return (
    <span className={`btn-inner ${className}`.trim()}>
      <Icon name={icon} size={18} className="btn-inner-icon" />
      <span>{children}</span>
    </span>
  )
}
