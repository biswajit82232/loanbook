import { configureFormatPrefs } from '../data/formatPrefs'
import type { AppSettings, ThemePreference } from '../data/types'

const THEME_COLORS: Record<'light' | 'dark', string> = {
  dark: '#0a101c',
  light: '#f1f5f9',
}

let systemThemeCleanup: (() => void) | null = null

function resolvedTheme(theme: ThemePreference): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

function updateThemeColorMeta(resolved: 'light' | 'dark') {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved])
}

function bindSystemThemeListener(onChange: () => void) {
  systemThemeCleanup?.()
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => onChange()
  mq.addEventListener('change', handler)
  systemThemeCleanup = () => mq.removeEventListener('change', handler)
}

export function applyAppearance(settings: AppSettings) {
  const root = document.documentElement
  const resolved = resolvedTheme(settings.theme)

  root.setAttribute('data-theme', resolved)
  root.setAttribute('data-accent', settings.accent)
  root.toggleAttribute('data-compact', settings.compactLists)

  configureFormatPrefs({
    currency: settings.currency,
    reminderPeriodDays: settings.reminderPeriodDays,
  })

  updateThemeColorMeta(resolved)

  if (settings.theme === 'system') {
    bindSystemThemeListener(() => {
      const next = resolvedTheme('system')
      root.setAttribute('data-theme', next)
      updateThemeColorMeta(next)
    })
  } else {
    systemThemeCleanup?.()
    systemThemeCleanup = null
  }
}
