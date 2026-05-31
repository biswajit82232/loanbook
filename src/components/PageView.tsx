import type { ReactNode } from 'react'

interface PageViewProps {
  viewKey: string
  children: ReactNode
}

/** Wraps routed content with enter animation when the view key changes. */
export function PageView({ viewKey, children }: PageViewProps) {
  return (
    <div key={viewKey} className="page-view">
      {children}
    </div>
  )
}
