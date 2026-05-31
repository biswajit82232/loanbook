import { useEffect, useId, useRef, useState } from 'react'
import type { Borrower } from '../data/types'

interface BorrowerPickerProps {
  label?: string
  borrowers: Borrower[]
  value: string
  onChange: (borrowerId: string) => void
  disabled?: boolean
  required?: boolean
}

export function BorrowerPicker({
  label = 'Borrower',
  borrowers,
  value,
  onChange,
  disabled,
  required,
}: BorrowerPickerProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = borrowers.find((b) => b.id === value)

  const [query, setQuery] = useState(selected?.name ?? '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!value) return
    const match = borrowers.find((b) => b.id === value)
    if (match) setQuery(match.name)
  }, [value, borrowers])

  const normalized = query.trim().toLowerCase()
  const filtered =
    normalized.length === 0
      ? borrowers
      : borrowers.filter(
          (b) =>
            b.name.toLowerCase().includes(normalized) ||
            b.phone.includes(query.trim()) ||
            b.id.toLowerCase().includes(normalized),
        )

  function pick(borrower: Borrower) {
    onChange(borrower.id)
    setQuery(borrower.name)
    setOpen(false)
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (!rootRef.current?.contains(document.activeElement)) {
        setOpen(false)
        const match = borrowers.find((b) => b.id === value)
        setQuery(match?.name ?? '')
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
          if (value && selected && next.trim() !== selected.name) {
            onChange('')
          }
        }}
        onFocus={() => !disabled && setOpen(true)}
        onBlur={handleBlur}
        autoComplete="off"
        disabled={disabled}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${listId}-list`}
      />
      {open && !disabled && filtered.length > 0 && (
        <ul id={`${listId}-list`} className="picker-list" role="listbox">
          {filtered.map((b) => (
            <li key={b.id} role="option" aria-selected={b.id === value}>
              <button type="button" className="picker-option" onMouseDown={() => pick(b)}>
                <span className="picker-option-title">{b.name}</span>
                <span className="picker-option-sub">{b.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !disabled && normalized.length > 0 && filtered.length === 0 && (
        <p className="picker-empty">No borrower found</p>
      )}
    </div>
  )
}
