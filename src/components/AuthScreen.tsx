import { useState, type FormEvent } from 'react'
import { Icon } from './Icon'

interface AuthScreenProps {
  onSignIn: (name: string) => void
}

export function AuthScreen({ onSignIn }: AuthScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Enter your username and password to continue.')
      return
    }
    onSignIn(username.trim())
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="9" r="4" /><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
              </svg>
              <span className="scan-line" />
            </div>
          </div>
          <div className="auth-brand-foot">
            <h2>Smart<br />Attendance System</h2>
            <p>Intelligent attendance management for your campus.</p>
          </div>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-heading-icon"><Icon name="users" size={22} /></div>
          <h1>Welcome back</h1>
          <p className="muted auth-subtitle">Sign in to your admin dashboard to continue</p>
          {error && <div className="error-message" role="alert">{error}</div>}
          <label className="form-field">
            <span>Username</span>
            <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter admin username" />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
          </label>
          <div className="auth-options">
            <label><input type="checkbox" defaultChecked /> Remember me</label>
            <span className="muted">Admin access only</span>
          </div>
          <button className="button button-primary button-wide" type="submit">Sign in <span aria-hidden="true">→</span></button>
          <p className="auth-note">Front-end preview · Connect your authentication service before deployment.</p>
        </form>
      </section>
    </main>
  )
}
