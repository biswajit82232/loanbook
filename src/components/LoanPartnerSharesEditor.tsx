import { BtnIcon } from './BtnIcon'
import { Icon } from './icons'
import type { InterestRatePeriod, LoanPartnerShare, Partner } from '../data/types'
import { PartnerPicker } from './PartnerPicker'
import { OptionButtons } from './OptionButtons'

interface LoanPartnerSharesEditorProps {
  partners: Partner[]
  shares: LoanPartnerShare[]
  onChange: (shares: LoanPartnerShare[]) => void
  loanPrincipal: number
  defaultRate: number
  defaultRatePeriod: InterestRatePeriod
  disabled?: boolean
}

const RATE_PERIOD_OPTIONS = [
  { value: 'monthly' as const, label: 'Monthly' },
  { value: 'yearly' as const, label: 'Yearly' },
]

const emptyShare = (ratePeriod: InterestRatePeriod): LoanPartnerShare => ({
  partnerId: '',
  amount: 0,
  rate: 0,
  ratePeriod,
})

export function LoanPartnerSharesEditor({
  partners,
  shares,
  onChange,
  defaultRate,
  defaultRatePeriod,
  disabled,
}: LoanPartnerSharesEditorProps) {
  const activePartners = partners.filter((p) => p.status === 'Active')

  function updateRow(index: number, patch: Partial<LoanPartnerShare>) {
    const next = shares.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange(next)
  }

  function pickPartner(index: number, partnerId: string) {
    const partner = activePartners.find((p) => p.id === partnerId)
    const row = shares[index]
    const patch: Partial<LoanPartnerShare> = { partnerId }
    if (partner && (!row.rate || row.rate === 0)) {
      patch.rate = defaultRate
      patch.ratePeriod = defaultRatePeriod
    }
    updateRow(index, patch)
  }

  function removeRow(index: number) {
    onChange(shares.filter((_, i) => i !== index))
  }

  function addRow() {
    onChange([...shares, emptyShare(defaultRatePeriod)])
  }

  if (activePartners.length === 0) {
    return <p className="empty-inline">No active partners</p>
  }

  return (
    <div className="field-group partner-shares-section">
      <div className="field-group-header">
        <span className="field-label">Partners</span>
      </div>

      {shares.map((row, index) => {
        const excludeIds = shares
          .map((s, i) => (i !== index ? s.partnerId : ''))
          .filter(Boolean)

        return (
          <div key={index} className="partner-share-card">
            <PartnerPicker
              label="Name"
              partners={activePartners}
              value={row.partnerId}
              onChange={(partnerId) => pickPartner(index, partnerId)}
              excludeIds={excludeIds}
              disabled={disabled}
              required
            />

            <div className="partner-share-fields">
              <label className="field">
                <span className="field-label">Amount (₹)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={row.amount === 0 ? 0 : row.amount || ''}
                  onChange={(e) =>
                    updateRow(index, { amount: Number(e.target.value) || 0 })
                  }
                  disabled={disabled}
                />
              </label>

              <label className="field">
                <span className="field-label">Rate (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.25}
                  value={row.rate || ''}
                  onChange={(e) =>
                    updateRow(index, { rate: Number(e.target.value) || 0 })
                  }
                  disabled={disabled}
                  required={!!row.partnerId}
                />
              </label>
            </div>

            <OptionButtons
              label="Period"
              value={row.ratePeriod}
              options={RATE_PERIOD_OPTIONS}
              onChange={(ratePeriod) => updateRow(index, { ratePeriod })}
              disabled={disabled}
            />

            {!disabled && (
              <button
                type="button"
                className="btn btn-ghost btn-sm partner-share-remove"
                onClick={() => removeRow(index)}
              >
                <span className="btn-inner">
                  <Icon name="trash" size={16} className="btn-inner-icon" />
                  <span>Remove</span>
                </span>
              </button>
            )}
          </div>
        )
      })}

      {!disabled && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
          <BtnIcon icon="plus">Add partner</BtnIcon>
        </button>
      )}
    </div>
  )
}

