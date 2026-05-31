import type { Session } from '@supabase/supabase-js'

export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

/** Matches Supabase client default: `sb-<project-ref>-auth-token` */
export function getSupabaseAuthStorageKey(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!url?.trim()) return null
  try {
    const ref = new URL(url).hostname.split('.')[0]
    return `sb-${ref}-auth-token`
  } catch {
    return null
  }
}

function isSessionShape(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false
  const s = value as Session
  return Boolean(s.access_token && s.user?.id)
}

/** Read cached session without calling Supabase (avoids network refresh on init). */
export function readPersistedAuthSession(): Session | null {
  if (typeof localStorage === 'undefined') return null
  const key = getSupabaseAuthStorageKey()
  if (!key) return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return isSessionShape(parsed) ? parsed : null
  } catch {
    return null
  }
}

const AUTH_INIT_TIMEOUT_MS = 8_000

export async function resolveInitialSession(
  getSession: () => Promise<{ data: { session: Session | null } }>,
): Promise<Session | null> {
  if (isBrowserOffline()) {
    return readPersistedAuthSession()
  }

  try {
    const { data } = await Promise.race([
      getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('auth-timeout')), AUTH_INIT_TIMEOUT_MS),
      ),
    ])
    return data.session
  } catch {
    return readPersistedAuthSession()
  }
}
