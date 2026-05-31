import { useEffect, useState } from 'react'
import type { AccentColor, AppSettings, CurrencyCode, ThemePreference } from '../data/types'
import { normalizeSettings } from '../data/settings'
import { APP_VERSION } from '../lib/version'
import { useAuth } from '../context/AuthContext'
import { useLoanBook } from '../context/LoanBookContext'
import { isSupabaseConfigured } from '../lib/env'
import { OptionButtons } from '../components/OptionButtons'
import { SettingsCollapsible } from '../components/SettingsCollapsible'
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
  const { settings, updateSettings, syncStatus, syncStatusLabel, retrySync } = useLoanBook()
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
        <SettingsCollapsible title="Business">
          <label className="field">
            <span className="field-label">Business name</span>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => patch({ businessName: e.target.value })}
            />
          </label>
        </SettingsCollapsible>

        <SettingsCollapsible title="Loan defaults">
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
        </SettingsCollapsible>

        <SettingsCollapsible title="Appearance">
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
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={form.compactLists}
              onChange={(e) => patch({ compactLists: e.target.checked })}
            />
            <span>Compact lists</span>
          </label>
        </SettingsCollapsible>

        <SettingsCollapsible title="Reminders">
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
        </SettingsCollapsible>

        <div className="form-page-actions settings-save-actions">
          <button type="submit" className="btn btn-primary">
            Save settings
          </button>
        </div>
      </form>

      {cloudAccount && user && (
        <SettingsCollapsible title="Account">
          <p className="settings-account-email">{user.email}</p>
          <p className={`settings-sync-status settings-sync-status--${syncStatus}`}>
            {syncStatusLabel}
          </p>
          {(syncStatus === 'error' || syncStatus === 'offline') && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={retrySync}>
              Retry sync
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </SettingsCollapsible>
      )}

      <SettingsCollapsible title="About">
        <p className="settings-version">Version {APP_VERSION}</p>
      </SettingsCollapsible>
    </div>
  )
}
