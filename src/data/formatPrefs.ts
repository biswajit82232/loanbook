import type { CurrencyCode } from './types'

let currencyCode: CurrencyCode = 'INR'
let reminderPeriodDays = 30

export function configureFormatPrefs(prefs: {
  currency: CurrencyCode
  reminderPeriodDays: number
}) {
  currencyCode = prefs.currency
  reminderPeriodDays = Math.min(90, Math.max(7, Math.round(prefs.reminderPeriodDays)))
}

export function getCurrencyCode(): CurrencyCode {
  return currencyCode
}

export function getReminderPeriodDays(): number {
  return reminderPeriodDays
}

export function getCurrencyLocale(code: CurrencyCode): string {
  switch (code) {
    case 'USD':
      return 'en-US'
    case 'EUR':
      return 'de-DE'
    case 'GBP':
      return 'en-GB'
    default:
      return 'en-IN'
  }
}
