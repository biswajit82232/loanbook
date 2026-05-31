import { useEffect, useId, useRef, useState } from 'react'
import type { Partner } from '../data/types'

interface PartnerPickerProps {
  label?: string
  partners: Partner[]
  value: string
  onChange: (partnerId: string) => void
  disabled?: boolean
  required?: boolean
  excludeIds?: string[]
}

export function PartnerPicker({
  label = 'Partner',
  partners,
  value,
  onChange,
  disabled,
  required,
  excludeIds = [],
}: PartnerPickerProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const available = partners.filter(
    (p) => p.status === 'Active' && (!excludeIds.includes(p.id) || p.id === value),
  )
  const selected = available.find((p) => p.id === value)

  const [query, setQuery] = useState(selected?.name ?? '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!value) return
    const match = partners.find((p) => p.id === value)
    if (match) setQuery(match.name)
  }, [value, partners])

  const normalized = query.trim().toLowerCase()
  const filtered =
    normalized.length === 0
      ? available
      : available.filter(
          (p) =>
            p.name.toLowerCase().includes(normalized) ||
            p.phone.includes(query.trim()) ||
            p.id.toLowerCase().includes(normalized),
        )

  function pick(partner: Partner) {
    onChange(partner.id)
    setQuery(partner.name)
    setOpen(false)
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (!rootRef.current?.contains(document.activeElement)) {
        setOpen(false)
        const match = partners.find((p) => p.id === value)
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
        disabled={disabled}
        autoComplete="off"
      />
      {open && !disabled && filtered.length > 0 && (
        <ul className="picker-list" role="listbox">
          {filtered.map((p) => (
            <li key={p.id}>
              <button type="button" className="picker-option" onMouseDown={() => pick(p)}>
                <span className="picker-option-title">{p.name}</span>
                <span className="picker-option-sub">{p.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
