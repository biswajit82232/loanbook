import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { LoadProgressUpdate } from '../data/load-progress'
import {
  isBrowserOffline,
  readPersistedAuthSession,
  resolveInitialSession,
} from '../lib/auth-session'
import { getAllowedEmail, isEmailAllowed, isSupabaseConfigured } from '../lib/env'
import { getSupabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  loadProgress: LoadProgressUpdate
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null; sent?: boolean }>
  signOut: () => Promise<void>
  isConfigured: boolean
  allowedEmailHint: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

function rejectUnauthorizedSession(session: Session | null): Session | null {
  const email = session?.user?.email
  if (email && !isEmailAllowed(email)) {
    void getSupabase().auth.signOut()
    return null
  }
  return session
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(configured)
  const [loadProgress, setLoadProgress] = useState<LoadProgressUpdate>({
    percent: 0,
    label: 'Starting LoanBook…',
  })

  useEffect(() => {
    if (!configured) {
      setLoadProgress({ percent: 100, label: 'Ready' })
      setLoading(false)
      return
    }

    const supabase = getSupabase()

    const finishAuth = (nextSession: Session | null) => {
      setSession(rejectUnauthorizedSession(nextSession))
      setLoadProgress({ percent: 100, label: 'Ready' })
      setLoading(false)
    }

    let subscription: { unsubscribe: () => void } | null = null

    const wireAuthListener = () => {
      if (subscription) return
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        finishAuth(nextSession)
      })
      subscription = data.subscription
    }

    const syncSessionFromCloud = () => {
      setLoadProgress({ percent: 15, label: 'Checking sign-in…' })
      void resolveInitialSession(() => supabase.auth.getSession()).then((cached) => {
        setLoadProgress({ percent: 85, label: 'Restoring session…' })
        finishAuth(cached)
      })
    }

    if (isBrowserOffline()) {
      setLoadProgress({ percent: 40, label: 'Offline — using saved sign-in…' })
      finishAuth(readPersistedAuthSession())
    } else {
      wireAuthListener()
      syncSessionFromCloud()
    }

    const onOnline = () => {
      wireAuthListener()
      syncSessionFromCloud()
    }
    window.addEventListener('online', onOnline)

    return () => {
      subscription?.unsubscribe()
      window.removeEventListener('online', onOnline)
    }
  }, [configured])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!configured) {
      return { error: 'Supabase is not configured for this build.' }
    }
    if (!isEmailAllowed(email)) {
      return { error: 'This email is not authorized to use LoanBook.' }
    }

    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    return { error: error?.message ?? null }
  }, [configured])

  const signOut = useCallback(async () => {
    if (!configured) return
    await getSupabase().auth.signOut()
  }, [configured])

  const resetPassword = useCallback(async (email: string) => {
    if (!configured) {
      return { error: 'Supabase is not configured for this build.' }
    }
    if (!isEmailAllowed(email)) {
      return { error: 'This email is not authorized to use LoanBook.' }
    }

    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + window.location.pathname,
    })
    if (error) return { error: error.message }
    return { error: null, sent: true }
  }, [configured])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      loadProgress,
      signIn,
      resetPassword,
      signOut,
      isConfigured: configured,
      allowedEmailHint: getAllowedEmail(),
    }),
    [session, loading, loadProgress, signIn, resetPassword, signOut, configured],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
