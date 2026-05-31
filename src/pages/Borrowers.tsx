import { useMemo, useState } from 'react'
import { BtnIcon } from '../components/BtnIcon'
import { CountBadge } from '../components/CountBadge'
import { SafeText } from '../components/SafeText'
import { Icon } from '../components/icons'
import {
  formatCurrency,
  getBorrowerInterestDue,
  getBorrowerLoanCounts,
  getBorrowerOutstanding,
  getBorrowerPrincipalDue,
} from '../data/helpers'
import { useNavigation } from '../context/NavigationContext'
import { useLoanBook } from '../context/LoanBookContext'
import { formatDisplayPhone, hasCallablePhone } from '../utils/phone'

function matchesBorrowerSearch(
  query: string,
  name: string,
  phone: string,
  id: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const digits = q.replace(/\D/g, '')
  if (name.toLowerCase().includes(q) || id.toLowerCase().includes(q)) return true
  if (digits.length >= 2) {
    const phoneDigits = phone.replace(/\D/g, '')
    return phoneDigits.includes(digits)
  }
  return false
}

export function Borrowers() {
  const { openDetail, openBorrowerForm } = useNavigation()
  const { borrowers, loans } = useLoanBook()
  const [search, setSearch] = useState('')

  const sortedBorrowers = useMemo(() => {
    return [...borrowers].sort((a, b) => {
      const dueA = getBorrowerOutstanding(loans, a.id)
      const dueB = getBorrowerOutstanding(loans, b.id)
      if (dueB !== dueA) return dueB - dueA
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  }, [borrowers, loans])

  const visibleBorrowers = useMemo(
    () =>
      sortedBorrowers.filter((b) =>
        matchesBorrowerSearch(search, b.name, b.phone, b.id),
      ),
    [sortedBorrowers, search],
  )

  return (
    <div className="page">
      <div className="page-actions page-actions--compact">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => openBorrowerForm({ mode: 'create' })}
        >
          <BtnIcon icon="plus">Add borrower</BtnIcon>
        </button>
      </div>

      {borrowers.length > 0 && (
        <label className="list-search field">
          <span className="visually-hidden">Search borrowers</span>
          <span className="list-search-icon" aria-hidden>
            <Icon name="search" size={18} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, or ID…"
            autoComplete="off"
            enterKeyHint="search"
          />
          {search.trim() && (
            <button
              type="button"
              className="list-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <Icon name="x" size={16} />
            </button>
          )}
        </label>
      )}

      {borrowers.length === 0 ? (
        <p className="empty-inline">No borrowers</p>
      ) : visibleBorrowers.length === 0 ? (
        <p className="empty-inline">No results</p>
      ) : (
        <ul className="compact-list">
          {visibleBorrowers.map((b) => {
            const { total: loanCount, active: activeLoans } = getBorrowerLoanCounts(
              loans,
              b.id,
            )
            const totalDue = getBorrowerOutstanding(loans, b.id)
            const principalDue = getBorrowerPrincipalDue(loans, b.id)
            const interestDue = getBorrowerInterestDue(loans, b.id)

            return (
              <li key={b.id}>
                <button
                  type="button"
                  className="compact-row compact-row--borrower"
                  onClick={() => openDetail({ type: 'borrower', id: b.id })}
                >
                  <span className="avatar avatar-sm" aria-hidden>
                    {b.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="compact-row-main">
                    <span className="compact-row-top">
                      <span className="compact-row-title-group">
                        <SafeText as="span" className="compact-row-id">
                          {b.name}
                        </SafeText>
                        {loanCount > 0 && (
                          <CountBadge
                            count={loanCount}
                            label={`${loanCount} loan${loanCount === 1 ? '' : 's'}`}
                          />
                        )}
                      </span>
                      {totalDue > 0 ? (
                        <span className="badge badge-due">Due</span>
                      ) : activeLoans > 0 ? (
                        <span className="badge badge-active">Active</span>
                      ) : loanCount > 0 ? (
                        <span className="badge badge-closed">Clear</span>
                      ) : (
                        <span className="badge badge-pending">No loans</span>
                      )}
                    </span>
                    <span className="compact-row-mid">
                      <span
                        className={`compact-row-name${!hasCallablePhone(b.phone) ? ' compact-row-name--muted' : ''}`}
                      >
                        {formatDisplayPhone(b.phone)}
                      </span>
                      <span className="compact-row-dot">·</span>
                      <span className="compact-row-days">{b.id}</span>
                    </span>
                    <span className="compact-row-bottom">
                      {totalDue > 0 ? (
                        <>
                          <SafeText variant="amount">{formatCurrency(totalDue)} due</SafeText>
                          {interestDue > 0 && (
                            <SafeText as="span" className="compact-row-interest" variant="amount">
                              {formatCurrency(principalDue)} prin. · {formatCurrency(interestDue)}{' '}
                              int.
                            </SafeText>
                          )}
                        </>
                      ) : (
                        <span className="compact-row-muted">No balance due</span>
                      )}
                    </span>
                  </span>
                  <Icon name="chevron-right" size={20} className="compact-row-chevron" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
