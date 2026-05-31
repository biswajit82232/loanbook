import { useEffect, type ReactNode } from 'react'
import { Icon } from './icons'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
  error?: string
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  children,
  error,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="modal confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <span className="modal-title-icon" aria-hidden>
              <Icon name="alert-triangle" size={22} />
            </span>
            <h2 id="confirm-dialog-title">{title}</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="modal-body">
          {message && <p className="confirm-dialog-message">{message}</p>}
          {children}
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button type="button" className="btn btn-danger" onClick={onConfirm}>
              <span className="btn-inner">
                <Icon name="trash" size={18} className="btn-inner-icon" />
                <span>{confirmLabel}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
