import { useState, type FormEvent, type KeyboardEvent } from 'react'
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
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([])
  const [organizationId, setOrganizationId] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const trimmedEmail = email.trim()
    const nextEmailError = !trimmedEmail
      ? 'Enter your email address.'
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
        ? ''
        : 'Enter a valid email address.'
    const nextPasswordError = password ? '' : 'Enter your password.'
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    if (nextEmailError || nextPasswordError) {
      return
    }
    setBusy(true)
    try {
      const result = await login(trimmedEmail, password, organizationId || undefined)
      if (result.organizationSelectionRequired) {
        setOrganizations(result.organizations ?? [])
        setOrganizationId(result.organizations?.[0]?.id ?? '')
      } else {
        navigate(result.user.role === 'SUPER_ADMIN' ? '/platform' : from, { replace: true })
      }
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
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M16 2.8 27 7v8.4c0 6.3-4.5 11.4-11 13.8C9.5 26.8 5 21.7 5 15.4V7l11-4.2Z" />
                <path d="m10.5 15.8 3.7 3.7 7.7-8" />
              </svg>
            </span>
            PR SMART ATTENDANCE
          </div>
          <div className="scan-face" aria-hidden="true">
            <div className="face-frame">
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              <svg
                viewBox="0 0 80 80"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M40 11c-14 0-23 11-23 27 0 17 9 31 23 31s23-14 23-31C63 22 54 11 40 11Z" />
                <path d="M31 36h.1M49 36h.1M34 52c3.5 3 8.5 3 12 0M40 38l-3 7h6" />
                <path d="M24 24c4-8 10-12 18-13M56 24c-4-8-10-12-18-13" opacity=".65" />
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
            <ul className="auth-trust-chips">
              <li><Icon name="live" size={15} /> Local processing</li>
              <li><Icon name="shield" size={15} /> Encrypted templates</li>
              <li><Icon name="clock" size={15} /> Manual fallback</li>
            </ul>
          </div>
        </div>
        <div className="auth-mobile-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M16 2.8 27 7v8.4c0 6.3-4.5 11.4-11 13.8C9.5 26.8 5 21.7 5 15.4V7l11-4.2Z" />
              <path d="m10.5 15.8 3.7 3.7 7.7-8" />
            </svg>
          </span>
          <span>PR SMART ATTENDANCE</span>
        </div>
        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="auth-heading-icon">
            <Icon name="users" size={22} />
          </div>
          <h1>{organizations.length > 0 ? 'Choose your organization' : 'Welcome back'}</h1>
          <p className="auth-subtitle">
            {organizations.length > 0
              ? 'This account has access to more than one workspace. Choose where to continue.'
              : 'Sign in to mark and manage attendance.'}
          </p>
          {error && (
            <div className="error-message auth-account-error" role="alert">
              {error}
            </div>
          )}
          <label className="form-field">
            <span>Email</span>
            <div className={`auth-input-wrap ${emailError ? 'has-error' : ''}`}>
              <Icon name="mail" size={18} />
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setEmailError('')
                }}
                placeholder="you@campus.edu"
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'login-email-error' : undefined}
                required
              />
            </div>
            {emailError && (
              <small className="auth-field-error" id="login-email-error">
                <Icon name="alert" size={14} /> {emailError}
              </small>
            )}
          </label>
          {organizations.length > 0 && (
            <label className="form-field">
              <span>Organization</span>
              <select
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                required
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="form-field">
            <span>Password</span>
            <div className={`password-input-wrap auth-input-wrap ${passwordError ? 'has-error' : ''}`}>
              <Icon name="lock" size={18} />
              <input
                id="login-password"
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError('')
                }}
                onKeyUp={(event: KeyboardEvent<HTMLInputElement>) => setCapsLockOn(event.getModifierState('CapsLock'))}
                onBlur={() => setCapsLockOn(false)}
                placeholder="Password"
                aria-invalid={Boolean(passwordError)}
                aria-describedby={[
                  passwordError ? 'login-password-error' : '',
                  capsLockOn ? 'login-caps-warning' : '',
                ].filter(Boolean).join(' ') || undefined}
                required
              />
              <button
                type="button"
                className="show-password-button auth-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
              </button>
            </div>
            {passwordError && (
              <small className="auth-field-error" id="login-password-error">
                <Icon name="alert" size={14} /> {passwordError}
              </small>
            )}
            {capsLockOn && <small className="auth-caps-warning" id="login-caps-warning" role="status">Caps Lock is on.</small>}
          </label>
          <div className="auth-options">
            <Link to="/forgot-password">Forgot password</Link>
          </div>
          <button
            className="button button-primary button-wide"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <><span className="auth-spinner" aria-hidden="true" /> Signing in…</>
            ) : (
              <>{organizations.length > 0 ? 'Continue' : 'Sign in'} <span aria-hidden="true">→</span></>
            )}
          </button>
          <p className="auth-privacy-note">Face templates are encrypted and scoped to your organization.</p>
          <Link className="auth-register-button" to="/register">Have a registration code? <strong>Complete registration</strong></Link>
        </form>
      </section>
      <footer className="auth-page-footer">Secure organization sign-in</footer>
    </main>
  );
}
