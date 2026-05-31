import { useEffect } from 'react'
import { useLoanBook } from '../context/LoanBookContext'
import { Icon } from './icons'

const ICON_BY_VARIANT = {
  success: 'check-circle' as const,
  error: 'alert-triangle' as const,
  warning: 'alert-triangle' as const,
}

export function Toast() {
  const { toast, clearToast } = useLoanBook()

  useEffect(() => {
    if (!toast) return
    const duration = toast.variant === 'error' ? 6000 : 4000
    const t = window.setTimeout(clearToast, duration)
    return () => window.clearTimeout(t)
  }, [toast, clearToast])

  if (!toast) return null

  return (
    <div
      className={`toast toast--${toast.variant}`}
      role={toast.variant === 'error' ? 'alert' : 'status'}
    >
      <Icon name={ICON_BY_VARIANT[toast.variant]} size={20} className="toast-icon" />
      <span className="toast-message">{toast.message}</span>
      <button type="button" className="toast-close" onClick={clearToast} aria-label="Dismiss">
        <Icon name="x" size={18} />
      </button>
    </div>
  )
}
