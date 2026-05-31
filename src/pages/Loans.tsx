import {
  formatCurrency,
  formatDaysLent,
  getBuiltUpInterest,
  getLoanLentDays,
  getLoanListAmountLabel,
} from '../data/helpers'
import { BtnIcon } from '../components/BtnIcon'
import { useNavigation } from '../context/NavigationContext'
import { useLoanBook } from '../context/LoanBookContext'

export function Loans() {
  const { openDetail, openLoanForm } = useNavigation()
  const { loans, getBorrower } = useLoanBook()

  return (
    <div className="page">
      <div className="page-actions page-actions--compact">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => openLoanForm({ mode: 'create' })}>
          <BtnIcon icon="plus">New loan</BtnIcon>
        </button>
      </div>

      {loans.length === 0 ? (
        <p className="empty-inline">No loans</p>
      ) : (
        <ul className="compact-list">
          {loans.map((loan) => {
            const borrower = getBorrower(loan.borrowerId)
            const days = formatDaysLent(getLoanLentDays(loan), loan)
            const interest =
              loan.status === 'Active' ? getBuiltUpInterest(loan) : 0

            return (
              <li key={loan.id}>
                <button
                  type="button"
                  className="compact-row"
                  onClick={() => openDetail({ type: 'loan', id: loan.id })}
                >
                  <div className="compact-row-top">
                    <span className="compact-row-id">{loan.id}</span>
                    <span className={`badge badge-${loan.status.toLowerCase()}`}>{loan.status}</span>
                  </div>
                  <div className="compact-row-mid">
                    <span className="compact-row-name">{borrower?.name ?? '—'}</span>
                    {days !== '—' && <span className="compact-row-dot">·</span>}
                    {days !== '—' && <span className="compact-row-days">{days}</span>}
                  </div>
                  <div className="compact-row-bottom">
                    <span>{getLoanListAmountLabel(loan)}</span>
                    {loan.status === 'Active' && interest > 0 && (
                      <span className="compact-row-interest">
                        +{formatCurrency(interest)} int.
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
