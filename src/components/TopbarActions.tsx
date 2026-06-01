import { useEffect, useMemo, useRef, useState } from 'react'
import { BorrowerContactButtons } from './BorrowerContactButtons'
import { useLoanBook } from '../context/LoanBookContext'
import { useNavigation } from '../context/NavigationContext'
import { applyAppUpdate, subscribeAppUpdate } from '../lib/pwa-update'
import { APP_VERSION } from '../lib/version'
import {
  formatReminderPeriodLabel,
  getAnchorLabel,
  getLoanNotificationReminders,
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
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [reloading, setReloading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => subscribeAppUpdate(setUpdateAvailable), [])

  const dismissed = useMemo(
    () => new Set(settings.reminderDismissed),
    [settings.reminderDismissed],
  )
  const reminders = useMemo(
    () =>
      getLoanNotificationReminders(loans, dismissed, new Date(), settings.reminderPeriodDays),
    [loans, dismissed, settings.reminderPeriodDays],
  )
  const showNotifications = updateAvailable || (page === 'dashboard' && !detail)
  const notifyBadgeCount = reminders.length + (updateAvailable ? 1 : 0)

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
    const message = buildLoanReminderMessage(borrower, loan)
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
      const message = buildBorrowerReminderMessage(contextBorrower, borrowerLoans)
      if (!openWhatsApp(contextBorrower.phone, message)) {
        showToast('Could not open WhatsApp. Check the phone number.', 'warning')
      }
    }
  }

  async function reloadForUpdate() {
    if (reloading) return
    setReloading(true)
    try {
      await applyAppUpdate()
    } catch {
      showToast('Could not reload. Try closing and reopening the app.', 'warning')
      setReloading(false)
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
            aria-label={`Notifications${
              notifyBadgeCount ? `, ${notifyBadgeCount} item${notifyBadgeCount === 1 ? '' : 's'}` : ''
            }`}
            aria-expanded={notifyOpen}
          >
            <Icon name="bell" size={22} />
            {notifyBadgeCount > 0 && (
              <span className="topbar-badge">
                {notifyBadgeCount > 9 ? '9+' : notifyBadgeCount}
              </span>
            )}
          </button>

          {notifyOpen && (
            <div className="topbar-notify-panel" role="dialog" aria-label="Notifications">
              <div className="topbar-notify-header">
                <strong>Notifications</strong>
              </div>
              {updateAvailable && (
                <div className="topbar-notify-update">
                  <p className="topbar-notify-update-title">App update available</p>
                  <p className="topbar-notify-update-sub">
                    You&apos;re on v{APP_VERSION}. A newer build is ready — reload to update.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm topbar-notify-update-btn"
                    disabled={reloading}
                    onClick={() => void reloadForUpdate()}
                  >
                    {reloading ? 'Reloading…' : 'Reload app'}
                  </button>
                </div>
              )}
              {reminders.length === 0 && !updateAvailable ? (
                <p className="topbar-notify-empty">None</p>
              ) : reminders.length > 0 ? (
                <>
                  {updateAvailable && (
                    <p className="topbar-notify-section-label">Loan reminders</p>
                  )}
                  <ul className="topbar-notify-list">
                  {reminders.map((r) => {
                    const borrower = getBorrower(r.borrowerId)
                    return (
                      <li
                        key={r.dismissKey}
                        className={`topbar-notify-item${
                          r.isUrgent
                            ? ' topbar-notify-item--urgent'
                            : r.isCritical
                              ? ' topbar-notify-item--critical'
                              : ''
                        }`}
                      >
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
                            {formatReminderPeriodLabel(r)}
                            {r.kind === 'value_limit'
                              ? ` · ${formatCurrency(r.totalDue)} total`
                              : r.interestDue > 0
                                ? ` · ${formatCurrency(r.interestDue)} int.`
                                : ''}
                          </span>
                          <span className="topbar-notify-sub">
                            {getAnchorLabel(r.loan)}
                            {r.due.dueDateLabel !== '—' ? ` · Due ${r.due.dueDateLabel}` : ''}
                          </span>
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
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
