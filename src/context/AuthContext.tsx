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
import { getAllowedEmail, isEmailAllowed, isSupabaseConfigured } from '../lib/env'
import { getSupabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  isConfigured: boolean
  allowedEmailHint: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(configured)

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }

    const supabase = getSupabase()

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
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

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signIn,
      signOut,
      isConfigured: configured,
      allowedEmailHint: getAllowedEmail(),
    }),
    [session, loading, signIn, signOut, configured],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
