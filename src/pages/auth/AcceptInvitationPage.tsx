import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Icon } from '../../components/Icon'

export function AcceptInvitationPage() {
  const { acceptInvitation } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const registrationCode = code.trim()
    if (!/^[A-Za-z0-9_-]{32}$/.test(registrationCode)) {
      setError('Enter the 32-character registration code shared by your organization administrator. This is not your email address.')
      return
    }
    if (!password || password.length > 128) {
      setError('Enter a password of no more than 128 characters.')
      return
    }
    setBusy(true)
    try {
      await acceptInvitation(registrationCode, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete registration.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-lockup"><span className="brand-dot" /> PR SMART ATTENDANCE</div>
          <div className="scan-face" aria-hidden="true">
            <div className="face-frame">
              <span className="corner tl" /><span className="corner tr" />
              <span className="corner bl" /><span className="corner br" />
              <Icon name="users" size={40} />
              <span className="scan-line" />
            </div>
          </div>
          <div className="auth-brand-foot">
            <h2>Join your organization.</h2>
            <p>Use the registration code shared with you to activate your account.</p>
          </div>
        </div>
        <form className="auth-form auth-registration-form" noValidate onSubmit={(event) => void submit(event)}>
          <div className="auth-heading-icon"><Icon name="users" size={22} /></div>
          <h1>Complete registration</h1>
          <p className="muted auth-subtitle">Enter the one-time code from your organization administrator. Codes expire after 24 hours.</p>
          {error && <div className="error-message" role="alert">{error}</div>}
          <label className="form-field">
            <span>Registration code</span>
            <input
              type="text"
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
                setError('')
              }}
              maxLength={32}
              placeholder="Paste your 32-character code"
              aria-describedby="registration-code-help"
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="one-time-code"
            />
            <small className="auth-field-help" id="registration-code-help">
              The code is 32 letters, numbers, dashes, or underscores—not your email address.
              <span>{code.trim().length}/32</span>
            </small>
          </label>
          <label className="form-field">
            <span>New password or existing account password</span>
            <div className="password-input-wrap">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                maxLength={128}
              />
              <button
                type="button"
                className="show-password-button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          <p className="auth-registration-help">
            New accounts need a password with at least 12 characters, uppercase and lowercase letters, a number, and a symbol.
            If you already have an account, enter its current password to join this organization.
          </p>
          <button className="button button-primary button-wide" type="submit" disabled={busy}>
            {busy ? 'Registering…' : 'Complete registration'} <span aria-hidden="true">→</span>
          </button>
          <p className="auth-note">Already registered? <Link to="/login">Sign in</Link></p>
        </form>
      </section>
    </main>
  )
}
