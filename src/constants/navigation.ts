import type { NavItem, PageId } from '../data/types'

export const PAGE_TITLES: Record<PageId, string> = {
  dashboard: 'Dashboard',
  loans: 'Loans',
  borrowers: 'Borrowers',
  partners: 'Partners',
  payments: 'Payments',
  reports: 'Reports',
  settings: 'Settings',
}

const NAV_ORDER: PageId[] = [
  'dashboard',
  'loans',
  'borrowers',
  'partners',
  'payments',
  'reports',
  'settings',
]

export const NAV_ITEMS: NavItem[] = NAV_ORDER.map((id) => ({
  id,
  label: PAGE_TITLES[id],
}))
