import type { SyncStatus } from '../data/local-cache'

function dotVariant(status: SyncStatus, pending: boolean): string {
  if (status === 'syncing') return 'syncing'
  if (status === 'error') return 'error'
  if (status === 'offline') return 'offline'
  if (status === 'synced') return 'synced'
  if (pending) return 'pending'
  return 'idle'
}

export function SyncStatusDot({
  status,
  pending,
  label,
  onRetry,
}: {
  status: SyncStatus
  pending: boolean
  label: string
  onRetry?: () => void
}) {
  const variant = dotVariant(status, pending)
  const canRetry = Boolean(onRetry) && (status === 'error' || status === 'offline')

  if (canRetry) {
    return (
      <button
        type="button"
        className={`sync-dot sync-dot--${variant}`}
        title={label}
        aria-label={label}
        onClick={onRetry}
      >
        <span className="visually-hidden">{label}</span>
      </button>
    )
  }

  return (
    <span
      className={`sync-dot sync-dot--${variant}`}
      title={label}
      role="status"
      aria-label={label}
    />
  )
}
