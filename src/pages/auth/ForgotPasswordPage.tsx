import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSent(true)
  }

  return (
    <main className="auth-wrap">
      <section className="auth-card auth-card-simple">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-heading-icon">
            <Icon name="key" size={22} />
          </div>
          <h1>Forgot password</h1>
          <p className="muted auth-subtitle">We’ll email a reset link if the account exists. The message is the same either way.</p>
          {sent ? (
            <div className="error-message" style={{ color: 'var(--green)', background: 'var(--green-pale)' }}>
              If that email is registered, a reset link is on its way.
            </div>
          ) : (
            <>
              <label className="form-field">
                <span>Email</span>
                <input type="email" required placeholder="you@campus.edu" />
              </label>
              <button className="button button-primary button-wide" type="submit">
                Send reset link
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

  return (
    <main className="auth-wrap">
      <section className="auth-card auth-card-simple">
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault()
            setDone(true)
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
              <label className="form-field">
                <span>New password</span>
                <input type="password" required minLength={8} />
              </label>
              <label className="form-field">
                <span>Confirm password</span>
                <input type="password" required minLength={8} />
              </label>
              <button className="button button-primary button-wide" type="submit">
                Update password
              </button>
            </>
          )}
        </form>
      </section>
    </main>
  )
}
