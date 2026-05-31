import { configureFormatPrefs } from './formatPrefs'
import type { AccentColor, AppSettings, CurrencyCode, ThemePreference } from './types'

const SETTINGS_KEY = 'loanbook-settings-v1'

export const defaultSettings: AppSettings = {
  businessName: 'My Lending',
  defaultRate: 2,
  defaultRatePeriod: 'monthly',
  theme: 'system',
  accent: 'teal',
  currency: 'INR',
  compactLists: false,
  reminderPeriodDays: 30,
  reminderDismissed: [],
  attentionDismissed: [],
}

const THEMES: ThemePreference[] = ['system', 'light', 'dark']
const ACCENTS: AccentColor[] = ['teal', 'blue', 'violet', 'amber']
const CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP']

export function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const base = { ...defaultSettings, ...raw }
  const rate = Number(base.defaultRate)
  const reminderDays = Number(base.reminderPeriodDays)

  return {
    businessName: String(base.businessName ?? defaultSettings.businessName).trim() || defaultSettings.businessName,
    defaultRate: Number.isFinite(rate) ? Math.min(100, Math.max(0, rate)) : defaultSettings.defaultRate,
    defaultRatePeriod: base.defaultRatePeriod === 'yearly' ? 'yearly' : 'monthly',
    theme: THEMES.includes(base.theme as ThemePreference)
      ? (base.theme as ThemePreference)
      : defaultSettings.theme,
    accent: ACCENTS.includes(base.accent as AccentColor)
      ? (base.accent as AccentColor)
      : defaultSettings.accent,
    currency: CURRENCIES.includes(base.currency as CurrencyCode)
      ? (base.currency as CurrencyCode)
      : defaultSettings.currency,
    compactLists: Boolean(base.compactLists),
    reminderPeriodDays: Number.isFinite(reminderDays)
      ? Math.min(90, Math.max(7, Math.round(reminderDays)))
      : defaultSettings.reminderPeriodDays,
    reminderDismissed: Array.isArray(base.reminderDismissed)
      ? base.reminderDismissed.filter((k): k is string => typeof k === 'string')
      : defaultSettings.reminderDismissed,
    attentionDismissed: Array.isArray(base.attentionDismissed)
      ? base.attentionDismissed.filter((k): k is string => typeof k === 'string')
      : defaultSettings.attentionDismissed,
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings
    return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>)
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: AppSettings) {
  const normalized = normalizeSettings(settings)
  configureFormatPrefs({
    currency: normalized.currency,
    reminderPeriodDays: normalized.reminderPeriodDays,
  })
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized))
  } catch {
    /* ignore */
  }
}
