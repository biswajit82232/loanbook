import { useEffect } from 'react'
import { useLoanBook } from '../context/LoanBookContext'
import { Icon } from './icons'

export function Toast() {
  const { toast, clearToast } = useLoanBook()

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(clearToast, 4000)
    return () => window.clearTimeout(t)
  }, [toast, clearToast])

  if (!toast) return null

  return (
    <div className="toast" role="status">
      <Icon name="check-circle" size={20} className="toast-icon" />
      <span className="toast-message">{toast}</span>
      <button type="button" className="toast-close" onClick={clearToast} aria-label="Dismiss">
        <Icon name="x" size={18} />
      </button>
    </div>
  )
}
