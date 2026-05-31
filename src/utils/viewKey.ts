import type { DetailRoute } from '../context/NavigationContext'
import type { PageId } from '../data/types'

/** Stable key for page transition animations when route changes. */
export function getNavigationViewKey(page: PageId, detail: DetailRoute | null): string {
  if (!detail) return `page:${page}`

  switch (detail.type) {
    case 'loan':
      return `loan:${detail.id}`
    case 'borrower':
      return `borrower:${detail.id}`
    case 'partner':
      return `partner:${detail.id}`
    case 'payment':
      return `payment:${detail.id}`
    case 'report':
      return `report:${detail.id}`
    case 'record-payment':
      return `record:${detail.scope ?? 'loan'}:${detail.borrowerId ?? detail.loanId ?? 'new'}:${detail.paymentType ?? ''}`
    case 'loan-form':
      return detail.mode === 'edit' ? `loan-edit:${detail.id}` : `loan-new:${detail.borrowerId ?? ''}`
    case 'borrower-form':
      return detail.mode === 'edit' ? `borrower-edit:${detail.id}` : 'borrower-new'
    case 'partner-form':
      return detail.mode === 'edit' ? `partner-edit:${detail.id}` : 'partner-new'
  }
}
