import { NavIcon } from './icons'
import type { NavItem, PageId } from '../data/types'

interface SidebarProps {
  items: NavItem[]
  activePage: PageId
  onNavigate: (page: PageId) => void
  isOpen: boolean
  onClose: () => void
  businessName?: string
}

export function Sidebar({
  items,
  activePage,
  onNavigate,
  isOpen,
  onClose,
  businessName = 'LoanBook',
}: SidebarProps) {
  const displayName = businessName.trim() || 'LoanBook'

  return (
    <>
      <div
        className={`sidebar-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand">
          <img src="/icon-192.png" alt="" width={36} height={36} className="sidebar-brand-logo" />
          <div className="brand-text">
            <span className="brand-name">{displayName}</span>
            <span className="brand-tagline">Loan management</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => {
                onNavigate(item.id)
                onClose()
              }}
              aria-current={activePage === item.id ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden>
                <NavIcon page={item.id} />
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  )
}
