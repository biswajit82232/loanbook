import { BtnIcon } from '../components/BtnIcon'
import { formatCurrency, getPaymentTypeLabel } from '../data/helpers'
import { useNavigation } from '../context/NavigationContext'
import { useLoanBook } from '../context/LoanBookContext'

export function Payments() {
  const { openDetail, openPaymentForm } = useNavigation()
  const { payments, getBorrower } = useLoanBook()

  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return (
    <div className="page">
      <div className="page-actions page-actions--compact">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => openPaymentForm()}>
          <BtnIcon icon="wallet">Record payment</BtnIcon>
        </button>
      </div>

      {sortedPayments.length === 0 ? (
        <p className="empty-inline">No payments</p>
      ) : (
        <ul className="compact-list">
          {sortedPayments.map((p) => {
            const borrower = getBorrower(p.borrowerId)
            const typeBadge =
              p.type === 'full_settlement' ? 'settlement' : 'interest'

            return (
              <li key={p.id}>
                <button
                  type="button"
                  className="compact-row"
                  onClick={() => openDetail({ type: 'payment', id: p.id })}
                >
                  <div className="compact-row-top">
                    <span className="compact-row-id">{p.id}</span>
                    <span className={`badge badge-${typeBadge}`}>
                      {getPaymentTypeLabel(p.type)}
                    </span>
                  </div>
                  <div className="compact-row-mid">
                    <span className="compact-row-name">{borrower?.name ?? '—'}</span>
                    <span className="compact-row-dot">·</span>
                    <span className="compact-row-days">{p.date}</span>
                    <span className="compact-row-dot">·</span>
                    <span className="compact-row-days">{p.mode}</span>
                  </div>
                  <div className="compact-row-bottom">
                    <span>{formatCurrency(p.amount)}</span>
                    {p.type === 'interest_only' && p.interestAmount > 0 && (
                      <span className="compact-row-interest">
                        {formatCurrency(p.interestAmount)} int.
                      </span>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
