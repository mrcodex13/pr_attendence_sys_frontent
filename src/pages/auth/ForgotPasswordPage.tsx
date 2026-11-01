import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { Icon } from '../../components/Icon'

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [developmentResetUrl, setDevelopmentResetUrl] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await api.forgotPassword(email.trim())
      setDevelopmentResetUrl(result.developmentResetUrl ?? '')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request a password reset.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-wrap">
      <section className="auth-card auth-card-simple">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-heading-icon">
            <Icon name="key" size={22} />
          </div>
          <h1>Forgot password</h1>
          <p className="muted auth-subtitle">We’ll send a reset link if the account exists. If email is unavailable, contact your platform administrator.</p>
          {sent ? (
            <div className="error-message" role="status" style={{ color: 'var(--green)', background: 'var(--green-pale)' }}>
              {developmentResetUrl ? (
                <>
                  Local development reset link:{' '}
                  <a href={developmentResetUrl}>Set a new password</a>
                </>
              ) : (
                'If that email is registered, a reset link is on its way.'
              )}
            </div>
          ) : (
            <>
              {error && <div className="error-message" role="alert">{error}</div>}
              <label className="form-field">
                <span>Email</span>
                <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@campus.edu" />
              </label>
              <button className="button button-primary button-wide" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </>
          )}
          <p className="auth-note">
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </section>
    </main>
  )
}

export function ResetPasswordPage() {
  const [done, setDone] = useState(false)
  const [params] = useSearchParams()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <main className="auth-wrap">
      <section className="auth-card auth-card-simple">
        <form
          className="auth-form"
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            const form = new FormData(e.currentTarget)
            const newPassword = String(form.get('newPassword') ?? '')
            const confirmPassword = String(form.get('confirmPassword') ?? '')
            if (newPassword !== confirmPassword) {
              setError('Passwords do not match.')
              return
            }
            const token = params.get('token')
            if (!token) {
              setError('This password reset link is invalid or expired.')
              return
            }
            setBusy(true)
            try {
              await api.resetPassword(token, newPassword)
              setDone(true)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not reset the password.')
            } finally {
              setBusy(false)
            }
          }}
        >
          <div className="auth-heading-icon">
            <Icon name="key" size={22} />
          </div>
          <h1>Reset password</h1>
          <p className="muted auth-subtitle">Choose a new password for your account.</p>
          {done ? (
            <p>
              Password updated. <Link to="/login">Sign in</Link>
            </p>
          ) : (
            <>
              {error && <div className="error-message" role="alert">{error}</div>}
              <label className="form-field">
                <span>New password</span>
                <input name="newPassword" type="password" required minLength={12} autoComplete="new-password" />
              </label>
              <label className="form-field">
                <span>Confirm password</span>
                <input name="confirmPassword" type="password" required minLength={12} autoComplete="new-password" />
              </label>
              <button className="button button-primary button-wide" type="submit" disabled={busy}>
                {busy ? 'Updating…' : 'Update password'}
              </button>
            </>
          )}
        </form>
      </section>
    </main>
  )
}
