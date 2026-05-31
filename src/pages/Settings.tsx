import { useEffect, useState } from 'react'
import type { AccentColor, AppSettings, CurrencyCode, ThemePreference } from '../data/types'
import { formatCurrency } from '../data/helpers'
import { normalizeSettings } from '../data/settings'
import { useAuth } from '../context/AuthContext'
import { useLoanBook } from '../context/LoanBookContext'
import { isSupabaseConfigured } from '../lib/env'
import { OptionButtons } from '../components/OptionButtons'
import { applyAppearance } from '../utils/appearance'

const RATE_PERIOD_OPTIONS = [
  { value: 'monthly' as const, label: 'Monthly' },
  { value: 'yearly' as const, label: 'Yearly' },
]

const THEME_OPTIONS = [
  { value: 'system' as const, label: 'System' },
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
]

const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: 'INR', label: '₹ INR' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GBP', label: '£ GBP' },
]

const ACCENT_OPTIONS: { value: AccentColor; label: string; swatch: string }[] = [
  { value: 'teal', label: 'Teal', swatch: '#0d9488' },
  { value: 'blue', label: 'Blue', swatch: '#2563eb' },
  { value: 'violet', label: 'Violet', swatch: '#7c3aed' },
  { value: 'amber', label: 'Amber', swatch: '#d97706' },
]

export function Settings() {
  const { settings, updateSettings } = useLoanBook()
  const { signOut, user } = useAuth()
  const cloudAccount = isSupabaseConfigured()
  const [form, setForm] = useState<AppSettings>(settings)

  useEffect(() => {
    setForm(settings)
  }, [settings])

  useEffect(() => {
    return () => applyAppearance(settings)
  }, [settings])

  function previewAppearance(next: AppSettings) {
    applyAppearance(normalizeSettings(next))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rate = Number(form.defaultRate)
    if (!Number.isFinite(rate) || rate < 0) return
    updateSettings({
      ...form,
      defaultRate: Math.min(100, rate),
    })
  }

  function patch(partial: Partial<AppSettings>) {
    const next = { ...form, ...partial }
    setForm(next)
    if (
      partial.theme !== undefined ||
      partial.accent !== undefined ||
      partial.compactLists !== undefined ||
      partial.currency !== undefined ||
      partial.reminderPeriodDays !== undefined
    ) {
      previewAppearance(next)
    }
  }

  return (
    <div className="page form-page settings-page">
      <form className="form form-page-form" onSubmit={handleSubmit}>
        <section className="settings-section">
          <h2 className="settings-section-title">Business</h2>
          <label className="field">
            <span className="field-label">Business name</span>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => patch({ businessName: e.target.value })}
            />
          </label>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Loan defaults</h2>
          <p className="settings-section-desc">Used when creating new loans and partners.</p>
          <label className="field">
            <span className="field-label">Default rate (%)</span>
            <input
              type="number"
              value={form.defaultRate}
              min={0}
              max={100}
              step={0.25}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (!Number.isFinite(n)) return
                patch({ defaultRate: n })
              }}
            />
          </label>
          <OptionButtons
            label="Rate period"
            value={form.defaultRatePeriod}
            options={RATE_PERIOD_OPTIONS}
            onChange={(value) => patch({ defaultRatePeriod: value })}
          />
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Appearance</h2>
          <OptionButtons
            label="Theme"
            value={form.theme}
            options={THEME_OPTIONS}
            onChange={(value: ThemePreference) => patch({ theme: value })}
          />
          <div className="field">
            <span className="field-label">Accent color</span>
            <div className="accent-picker" role="group" aria-label="Accent color">
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`accent-swatch ${form.accent === opt.value ? 'active' : ''}`}
                  onClick={() => patch({ accent: opt.value })}
                  aria-pressed={form.accent === opt.value}
                  title={opt.label}
                >
                  <span className="accent-swatch-dot" style={{ background: opt.swatch }} />
                  <span className="accent-swatch-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <OptionButtons
            label="Currency display"
            value={form.currency}
            options={CURRENCY_OPTIONS}
            onChange={(value) => patch({ currency: value })}
          />
          <p className="field-hint settings-preview-hint">
            Preview: {formatCurrency(125000)}
          </p>
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={form.compactLists}
              onChange={(e) => patch({ compactLists: e.target.checked })}
            />
            <span>Compact lists (denser rows on loans, payments, borrowers)</span>
          </label>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Reminders</h2>
          <p className="settings-section-desc">
            Dashboard bell alerts when interest is due and this many days have passed since the
            last payment (or loan start).
          </p>
          <label className="field">
            <span className="field-label">Reminder period (days)</span>
            <input
              type="number"
              value={form.reminderPeriodDays}
              min={7}
              max={90}
              step={1}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (!Number.isFinite(n)) return
                patch({ reminderPeriodDays: n })
              }}
            />
          </label>
        </section>

        <div className="form-page-actions">
          <button type="submit" className="btn btn-primary">
            Save settings
          </button>
        </div>
      </form>

      {cloudAccount && user && (
        <section className="settings-section settings-section--account">
          <h2 className="settings-section-title">Account</h2>
          <p className="settings-section-desc">Signed in as {user.email}</p>
          <button type="button" className="btn btn-secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </section>
      )}
    </div>
  )
}
