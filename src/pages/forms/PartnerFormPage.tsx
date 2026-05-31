import { useState } from 'react'
import type { PartnerStatus } from '../../data/types'
import { formatDisplayDate } from '../../data/helpers'
import { useLoanBook } from '../../context/LoanBookContext'
import { useNavigation } from '../../context/NavigationContext'
import { toInputDate, toInputDateFromDisplay } from '../../utils/dateInput'
import { OptionButtons } from '../../components/OptionButtons'
import { DateField } from '../../components/DateField'

interface PartnerFormPageProps {
  mode: 'create' | 'edit'
  partnerId?: string
}

const STATUS_OPTIONS = [
  { value: 'Active' as const, label: 'Active' },
  { value: 'Inactive' as const, label: 'Inactive' },
]

export function PartnerFormPage({ mode, partnerId }: PartnerFormPageProps) {
  const { getPartner, createPartner, updatePartner } = useLoanBook()
  const { goBack } = useNavigation()

  const isEdit = mode === 'edit'
  const existing = isEdit && partnerId ? getPartner(partnerId) : undefined

  const [name, setName] = useState(() => (existing ? existing.name : ''))
  const [phone, setPhone] = useState(() => (existing ? existing.phone : ''))
  const [startDate, setStartDate] = useState(() =>
    existing ? toInputDateFromDisplay(existing.startDate) : toInputDate(new Date()),
  )
  const [status, setStatus] = useState<PartnerStatus>(() =>
    existing ? existing.status : 'Active',
  )
  const [notes, setNotes] = useState(() => (existing ? existing.notes : ''))
  const [error, setError] = useState('')

  if (isEdit && partnerId && !existing) {
    return (
      <div className="page form-page">
        <p className="empty-state">Partner not found.</p>
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
      const result = updatePartner({
        partnerId: existing.id,
        name,
        phone,
        startDate: formatDisplayDate(new Date(startDate)),
        status,
        notes,
      })
      if (result.ok) goBack()
      else setError(result.error)
      return
    }

    const result = createPartner({
      name,
      phone,
      startDate: formatDisplayDate(new Date(startDate)),
      status,
      notes,
    })
    if (result.ok) goBack()
    else setError(result.error)
  }

  return (
    <div className="page form-page">
      <form className="form form-page-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">
            Phone <span className="field-optional">(optional)</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </label>
        <DateField label="Partner since" value={startDate} onChange={setStartDate} required />
        <OptionButtons label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        <label className="field">
          <span className="field-label">Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-page-actions">
          <button type="button" className="btn btn-secondary" onClick={goBack}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEdit ? 'Save' : 'Add partner'}
          </button>
        </div>
      </form>
    </div>
  )
}
