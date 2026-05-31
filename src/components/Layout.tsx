import { useMemo, useState, useEffect, type ReactNode } from 'react'
import { getLoansForPartner } from '../data/helpers'
import { CountBadge } from './CountBadge'
import { SafeText } from './SafeText'
import { Icon } from './icons'
import { Sidebar } from './Sidebar'
import { TopbarActions } from './TopbarActions'
import { useLoanBook } from '../context/LoanBookContext'
import { useNavigation } from '../context/NavigationContext'
import { NAV_ITEMS } from '../constants/navigation'

export function Layout({ children }: { children: ReactNode }) {
  const { settings, loans } = useLoanBook()
  const { page, title, canGoBack, detail, setPage, goBack } = useNavigation()
  const loanCount = loans.length

  const topbarLoanCount = useMemo(() => {
    if (!detail) {
      return page === 'loans' ? loanCount : undefined
    }
    if (detail.type === 'borrower') {
      return loans.filter((l) => l.borrowerId === detail.id).length
    }
    if (detail.type === 'partner') {
      return getLoansForPartner(detail.id, loans).length
    }
    return undefined
  }, [detail, page, loans, loanCount])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = () => {
      if (mq.matches) setSidebarOpen(false)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="app-shell">
      <Sidebar
        items={NAV_ITEMS}
        activePage={page}
        onNavigate={setPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        businessName={settings.businessName}
      />

      <div className="main-column">
        <header className="topbar">
          {canGoBack ? (
            <button
              type="button"
              className="back-btn"
              onClick={goBack}
              aria-label="Go back"
            >
              <Icon name="chevron-left" size={22} className="back-btn-icon" aria-hidden />
              <span className="back-btn-label">Back</span>
            </button>
          ) : (
            <button
              type="button"
              className="menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
            >
              <Icon name="menu" size={20} className="menu-icon" />
            </button>
          )}
          <h1 className="page-title">
            <SafeText as="span" className="page-title-text">
              {title}
            </SafeText>
            {topbarLoanCount !== undefined && (
              <CountBadge count={topbarLoanCount} label={`${topbarLoanCount} loans`} />
            )}
          </h1>
          <TopbarActions />
        </header>

        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}
