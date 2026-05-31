import { useState, useEffect, type ReactNode } from 'react'
import { Icon } from './icons'
import { Sidebar } from './Sidebar'
import { TopbarActions } from './TopbarActions'
import { useLoanBook } from '../context/LoanBookContext'
import { useNavigation } from '../context/NavigationContext'
import { NAV_ITEMS } from '../constants/navigation'

export function Layout({ children }: { children: ReactNode }) {
  const { settings } = useLoanBook()
  const { page, title, canGoBack, setPage, goBack } = useNavigation()
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
              aria-label="Back"
            >
              <Icon name="chevron-left" size={20} className="back-btn-icon" />
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
          <h1 className="page-title">{title}</h1>
          <TopbarActions />
        </header>

        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}
