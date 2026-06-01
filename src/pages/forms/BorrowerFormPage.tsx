import { useState } from 'react'
import { useLoanBook } from '../../context/LoanBookContext'
import { useNavigation } from '../../context/NavigationContext'

interface BorrowerFormPageProps {
  mode: 'create' | 'edit'
  borrowerId?: string
  initialName?: string
}

export function BorrowerFormPage({ mode, borrowerId, initialName }: BorrowerFormPageProps) {
  const { getBorrower, createBorrower, updateBorrower } = useLoanBook()
  const { goBack } = useNavigation()

  const isEdit = mode === 'edit'
  const existing = isEdit && borrowerId ? getBorrower(borrowerId) : undefined

  const [name, setName] = useState(() => (existing ? existing.name : (initialName ?? '')))
  const [phone, setPhone] = useState(() => (existing ? existing.phone : ''))
  const [address, setAddress] = useState(() =>
    existing && existing.address !== '—' ? existing.address : '',
  )
  const [notes, setNotes] = useState(() => (existing ? existing.notes : ''))
  const [error, setError] = useState('')

  if (isEdit && borrowerId && !existing) {
    return (
      <div className="page form-page">
        <p className="empty-state">Borrower not found.</p>
        <button type="button" className="btn btn-secondary" onClick={goBack}>
          Back
        </button>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (isEdit && existing) {
      const result = updateBorrower({
        borrowerId: existing.id,
        name,
        phone,
        address,
        notes,
      })
      if (result.ok) goBack()
      else setError(result.error)
      return
    }

    const result = createBorrower({ name, phone, address, notes })
    if (result.ok) goBack()
    else setError(result.error)
  }

  return (
    <div className="page form-page">
      <form className="form form-page-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Phone
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </label>
        <label>
          Address
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-page-actions">
          <button type="button" className="btn btn-secondary" onClick={goBack}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEdit ? 'Save' : 'Add borrower'}
          </button>
        </div>
      </form>
    </div>
  )
}
