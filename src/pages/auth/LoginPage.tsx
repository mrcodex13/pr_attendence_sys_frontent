import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Icon } from '../../components/Icon'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password to continue.')
      return
    }
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-lockup">
            <span className="brand-dot" /> PR SMART ATTENDANCE
          </div>
          <div className="scan-face" aria-hidden="true">
            <div className="face-frame">
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <circle cx="12" cy="9" r="4" />
                <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
              </svg>
              <span className="scan-line" />
            </div>
          </div>
          <div className="auth-brand-foot">
            <h2>
              Proof of presence,
              <br />
              without the friction.
            </h2>
            <p>
              On-device recognition. Events in the cloud. Decisions you can
              trust.
            </p>
          </div>
        </div>
        <form className="auth-form" autoComplete="off" onSubmit={submit}>
          <div className="auth-heading-icon">
            <Icon name="users" size={22} />
          </div>
          <h1>Welcome back</h1>
          <p className="muted auth-subtitle">
            Sign in with your school or company account
          </p>
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          <label className="form-field">
            <span>Email</span>
            <input
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@campus.edu"
            />
          </label>
          <label className="form-field">
            <span>Password</span>

            <div className="password-input-wrap">
              <input
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />

              <button
                type="button"
                className="show-password-button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <div className="auth-options">
            <label>
              <input type="checkbox" defaultChecked /> Remember me
            </label>
            <Link to="/forgot-password">Forgot password</Link>
          </div>
          <button
            className="button button-primary button-wide"
            type="submit"
            disabled={busy}
          >
            {busy ? "Signing in…" : "Sign in"} <span aria-hidden="true">→</span>
          </button>
          <p className="auth-note">
            Front-end preview · Connect your authentication service before
            deployment.
          </p>
        </form>
      </section>
    </main>
  );
}
