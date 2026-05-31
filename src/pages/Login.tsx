import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Icon } from '../components/icons'

export function Login() {
  const { signIn, allowedEmailHint, isConfigured } = useAuth()
  const [email, setEmail] = useState(allowedEmailHint ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
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
            Supabase environment variables are missing. Add{' '}
            <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> for
            deployment, or run locally without them to use browser storage.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/favicon.svg" alt="" width={48} height={48} />
          <h1>LoanBook</h1>
          <p>Sign in to manage your loans</p>
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

          {allowedEmailHint && (
            <p className="field-hint">Only {allowedEmailHint} can access this app.</p>
          )}

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footnote">
          <Icon name="landmark" size={16} /> Private lending — single account
        </p>
      </div>
    </div>
  )
}
