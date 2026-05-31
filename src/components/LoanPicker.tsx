import { useEffect, useId, useRef, useState } from 'react'
import type { Borrower, Loan } from '../data/types'
import { formatCurrency, getLoanTotalDue } from '../data/helpers'

interface LoanPickerProps {
  label?: string
  loans: Loan[]
  getBorrower: (id: string) => Borrower | undefined
  value: string
  onChange: (loanId: string) => void
  required?: boolean
}

export function LoanPicker({
  label = 'Loan',
  loans,
  getBorrower,
  value,
  onChange,
  required,
}: LoanPickerProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = loans.find((l) => l.id === value)

  const formatLoan = (loan: Loan) => {
    const b = getBorrower(loan.borrowerId)
    return `${b?.name ?? '—'} · ${loan.id} · ${formatCurrency(getLoanTotalDue(loan))}`
  }

  const [query, setQuery] = useState(() => (selected ? formatLoan(selected) : ''))
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!value) return
    const match = loans.find((l) => l.id === value)
    if (match) setQuery(formatLoan(match))
  }, [value, loans])

  const normalized = query.trim().toLowerCase()
  const filtered =
    normalized.length === 0
      ? loans
      : loans.filter((l) => {
          const b = getBorrower(l.borrowerId)
          const haystack = `${b?.name ?? ''} ${l.id} ${l.purpose}`.toLowerCase()
          return haystack.includes(normalized)
        })

  function pick(loan: Loan) {
    onChange(loan.id)
    setQuery(formatLoan(loan))
    setOpen(false)
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (!rootRef.current?.contains(document.activeElement)) {
        setOpen(false)
        const match = loans.find((l) => l.id === value)
        setQuery(match ? formatLoan(match) : '')
      }
    }, 120)
  }

  return (
    <div className="field" ref={rootRef}>
      <label className="field-label" htmlFor={listId}>
        {label}
        {required && <span className="field-required"> *</span>}
      </label>
      <input
        id={listId}
        type="text"
        className="picker-input"
        value={query}
        onChange={(e) => {
          const next = e.target.value
          setQuery(next)
          setOpen(true)
          if (value && selected && next.trim() !== formatLoan(selected)) {
            onChange('')
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder="Type borrower or loan ID…"
        autoComplete="off"
        required={required}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${listId}-list`}
      />
      {open && filtered.length > 0 && (
        <ul id={`${listId}-list`} className="picker-list" role="listbox">
          {filtered.map((l) => {
            const b = getBorrower(l.borrowerId)
            return (
              <li key={l.id} role="option" aria-selected={l.id === value}>
                <button type="button" className="picker-option" onMouseDown={() => pick(l)}>
                  <span className="picker-option-title">
                    {b?.name ?? '—'} · {l.id}
                  </span>
                  <span className="picker-option-sub">
                    {l.purpose ? `${l.purpose} · ` : ''}
                    {formatCurrency(getLoanTotalDue(l))}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {open && normalized.length > 0 && filtered.length === 0 && (
        <p className="picker-empty">No loan found</p>
      )}
    </div>
  )
}
