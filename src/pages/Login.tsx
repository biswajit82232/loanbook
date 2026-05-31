import { useState } from 'react'
import { BRAND_ICON_192 } from '../constants/brand'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { signIn, resetPassword, allowedEmailHint, isConfigured } = useAuth()
  const [email, setEmail] = useState(allowedEmailHint ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resetMode, setResetMode] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)

    if (resetMode) {
      const result = await resetPassword(email)
      setSubmitting(false)
      if (result.error) {
        setError(result.error)
      } else {
        setInfo('Password reset link sent — check your email.')
        setResetMode(false)
      }
      return
    }

    const result = await signIn(email, password)
    setSubmitting(false)
    if (result.error) setError(result.error)
  }

  if (!isConfigured) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>LoanBook</h1>
          <p className="auth-message">
            Cloud sign-in requires <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code>. For local-only mode, remove those from{' '}
            <code>.env</code> and rebuild.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <img src={BRAND_ICON_192} alt="" width={64} height={64} className="auth-brand-logo" />
          <h1>LoanBook</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          {!resetMode && (
            <label className="field">
              <span className="field-label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
          )}

          {error && <p className="form-error">{error}</p>}
          {info && <p className="form-info">{info}</p>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
            {submitting
              ? resetMode
                ? 'Sending…'
                : 'Signing in…'
              : resetMode
                ? 'Send reset link'
                : 'Sign in'}
          </button>

          <button
            type="button"
            className="btn btn-ghost auth-link-btn"
            onClick={() => {
              setResetMode((m) => !m)
              setError('')
              setInfo('')
            }}
          >
            {resetMode ? 'Back to sign in' : 'Forgot password?'}
          </button>
        </form>
      </div>
    </div>
  )
}
