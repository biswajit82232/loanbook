import {
  formatCurrency,
  formatDaysLent,
  getBuiltUpInterest,
  getLoanLentDays,
  getLoanListAmountLabel,
} from '../data/helpers'
import { BtnIcon } from '../components/BtnIcon'
import { SafeText } from '../components/SafeText'
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
                    <SafeText as="span" className="compact-row-id">
                      {loan.id}
                    </SafeText>
                    <span className={`badge badge-${loan.status.toLowerCase()}`}>{loan.status}</span>
                  </div>
                  <div className="compact-row-mid">
                    <SafeText as="span" className="compact-row-name">
                      {borrower?.name ?? '—'}
                    </SafeText>
                    {days !== '—' && <span className="compact-row-dot">·</span>}
                    {days !== '—' && <span className="compact-row-days">{days}</span>}
                  </div>
                  <div className="compact-row-bottom">
                    <SafeText as="span" className="compact-row-principal" variant="amount">
                      {getLoanListAmountLabel(loan)}
                      {loan.status !== 'Pending' && (
                        <span className="compact-row-principal-label"> lent</span>
                      )}
                    </SafeText>
                    {loan.status === 'Active' && interest > 0 && (
                      <SafeText as="span" className="compact-row-interest" variant="amount">
                        · {formatCurrency(interest)} int.
                      </SafeText>
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
