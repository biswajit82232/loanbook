import { useEffect, useMemo, useRef, useState } from 'react'
import { BorrowerContactButtons } from './BorrowerContactButtons'
import { useLoanBook } from '../context/LoanBookContext'
import { useNavigation } from '../context/NavigationContext'
import {
  formatReminderPeriodLabel,
  getAnchorLabel,
  getMonthlyLoanReminders,
  borrowerHasPhone,
} from '../data/reminders'
import {
  buildBorrowerReminderMessage,
  buildLoanReminderMessage,
  openWhatsApp,
} from '../utils/whatsapp'
import { formatCurrency } from '../data/helpers'
import { Icon } from './icons'

export function TopbarActions() {
  const { page, detail, openDetail } = useNavigation()
  const { loans, settings, getBorrower, getLoansByBorrower, dismissReminder, showToast } =
    useLoanBook()
  const [notifyOpen, setNotifyOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const dismissed = useMemo(
    () => new Set(settings.reminderDismissed),
    [settings.reminderDismissed],
  )
  const reminders = getMonthlyLoanReminders(loans, dismissed)
  const showNotifications = page === 'dashboard' && !detail

  const loanDetail = detail?.type === 'loan' ? detail.id : undefined
  const borrowerDetail = detail?.type === 'borrower' ? detail.id : undefined

  const contextLoan = loanDetail ? loans.find((l) => l.id === loanDetail) : undefined
  const contextBorrower = borrowerDetail
    ? getBorrower(borrowerDetail)
    : contextLoan
      ? getBorrower(contextLoan.borrowerId)
      : undefined

  const showContact =
    (contextLoan && contextBorrower && borrowerHasPhone(contextBorrower)) ||
    (contextBorrower && borrowerDetail && borrowerHasPhone(contextBorrower))

  useEffect(() => {
    if (!notifyOpen) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotifyOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [notifyOpen])

  function sendLoanWhatsApp(loanId: string, borrowerId: string) {
    const loan = loans.find((l) => l.id === loanId)
    const borrower = getBorrower(borrowerId)
    if (!loan || !borrower) return
    const message = buildLoanReminderMessage(borrower, loan, settings.businessName)
    if (!openWhatsApp(borrower.phone, message)) {
      showToast('Could not open WhatsApp. Check the phone number.', 'warning')
    }
  }

  function sendContextWhatsApp() {
    if (contextLoan && contextBorrower) {
      sendLoanWhatsApp(contextLoan.id, contextBorrower.id)
      return
    }
    if (contextBorrower && borrowerDetail) {
      const borrowerLoans = getLoansByBorrower(contextBorrower.id)
      const message = buildBorrowerReminderMessage(
        contextBorrower,
        borrowerLoans,
        settings.businessName,
      )
      if (!openWhatsApp(contextBorrower.phone, message)) {
        showToast('Could not open WhatsApp. Check the phone number.', 'warning')
      }
    }
  }

  if (!showNotifications && !showContact) return null

  return (
    <div className="topbar-actions">
      {showContact && contextBorrower && (
        <BorrowerContactButtons phone={contextBorrower.phone} onWhatsApp={sendContextWhatsApp} />
      )}

      {showNotifications && (
        <div className="topbar-notify-wrap" ref={panelRef}>
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={() => setNotifyOpen((o) => !o)}
            aria-label={`Monthly reminders${reminders.length ? `, ${reminders.length} active` : ''}`}
            aria-expanded={notifyOpen}
          >
            <Icon name="bell" size={22} />
            {reminders.length > 0 && (
              <span className="topbar-badge">{reminders.length > 9 ? '9+' : reminders.length}</span>
            )}
          </button>

          {notifyOpen && (
            <div className="topbar-notify-panel" role="dialog" aria-label="Monthly loan reminders">
              <div className="topbar-notify-header">
                <strong>Reminders</strong>
              </div>
              {reminders.length === 0 ? (
                <p className="topbar-notify-empty">None</p>
              ) : (
                <ul className="topbar-notify-list">
                  {reminders.map((r) => {
                    const borrower = getBorrower(r.borrowerId)
                    return (
                      <li key={r.dismissKey} className="topbar-notify-item">
                        <button
                          type="button"
                          className="topbar-notify-main"
                          onClick={() => {
                            setNotifyOpen(false)
                            openDetail({ type: 'loan', id: r.loan.id })
                          }}
                        >
                          <span className="topbar-notify-title">
                            {borrower?.name ?? '—'} · {r.loan.id}
                          </span>
                          <span className="topbar-notify-sub">
                            {formatReminderPeriodLabel(r)} · {formatCurrency(r.interestDue)} int.
                          </span>
                          <span className="topbar-notify-sub">{getAnchorLabel(r.loan)}</span>
                        </button>
                        <div className="topbar-notify-actions">
                          {borrower && borrowerHasPhone(borrower) && (
                            <BorrowerContactButtons
                              phone={borrower.phone}
                              size="sm"
                              onWhatsApp={() => sendLoanWhatsApp(r.loan.id, r.borrowerId)}
                            />
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => dismissReminder(r.dismissKey)}
                          >
                            Dismiss
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
