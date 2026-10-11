import { useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { PermissionGate } from '../../components/ui/Feedback'
import { PageHeader } from '../../components/ui/Workflow'
import { SelectField, TextField } from '../../components/ui/Forms'
import { formatDateTime } from '../../lib/format'
import { Icon } from '../../components/Icon'

export function UsersPage() {
  const users = api.users()
  return (
    <PermissionGate permission="users.manage">
      <div className="view-stack">
        <PageHeader title="Users & roles" subtitle="Super admin owns other admins. Teachers and managers are scoped to groups." />
        <section className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </PermissionGate>
  )
}

export function SettingsPage() {
  const current = api.settings()
  const [saved, setSaved] = useState('')
  return (
    <PermissionGate permission="settings.manage">
      <form
        className="view-stack"
        onSubmit={(e) => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          api.saveSettings({
            name: String(form.get('name')),
            mode: String(form.get('mode')) as typeof current.mode,
            timezone: String(form.get('timezone')),
            graceMinutes: Number(form.get('graceMinutes')),
            debounceSeconds: Number(form.get('debounceSeconds')),
            minConfidence: Number(form.get('minConfidence')),
            retentionDays: Number(form.get('retentionDays')),
          })
          setSaved('Settings saved. Thresholds are no longer hardcoded at 10:00 UTC.')
        }}
      >
        <PageHeader title="Organization settings" subtitle="Mode, timezone, grace, debounce, minimum confidence, retention." />
        {saved && <p className="muted">{saved}</p>}
        <section className="panel form-grid">
          <TextField name="name" label="Organization" defaultValue={current.name} />
          <SelectField name="mode" label="Mode" defaultValue={current.mode}>
            <option value="SCHOOL">School</option>
            <option value="COMPANY">Company</option>
            <option value="BOTH">Both</option>
          </SelectField>
          <TextField name="timezone" label="Timezone" defaultValue={current.timezone} />
          <TextField name="graceMinutes" label="Grace minutes" type="number" defaultValue={current.graceMinutes} />
          <TextField name="debounceSeconds" label="Debounce seconds" type="number" defaultValue={current.debounceSeconds} />
          <TextField name="minConfidence" label="Minimum confidence" type="number" step="0.01" defaultValue={current.minConfidence} />
          <TextField name="retentionDays" label="Scan retention (days)" type="number" defaultValue={current.retentionDays} />
        </section>
        <button className="button button-primary" type="submit">
          Save settings
        </button>
      </form>
    </PermissionGate>
  )
}

export function AuditPage() {
  const logs = api.audit()
  return (
    <PermissionGate permission="audit.view">
      <div className="view-stack">
        <PageHeader title="Audit log" subtitle="Every correction and enrolment start is traceable." />
        <section className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{formatDateTime(l.at)}</td>
                  <td>{l.actor}</td>
                  <td className="mono">{l.action}</td>
                  <td>{l.entity}</td>
                  <td>{l.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </PermissionGate>
  )
}

export function PrivacyPage() {
  const people = api.people()
  return (
    <PermissionGate permission="privacy.manage">
      <div className="view-stack">
        <PageHeader title="Privacy & consent" subtitle="Face templates stay on the device. Support deletion requests." />
        <section className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Consent</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.consentGiven ? 'Recorded' : 'Missing'}</td>
                  <td>
                    <button className="button button-secondary" type="button">
                      Request deletion
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </PermissionGate>
  )
}

export function NotificationsPage() {
  const items = api.notifications()
  return (
    <div className="view-stack">
      <PageHeader title="Notifications" />
      <section className="notification-panel panel">
        {items.map((n) => (
          <div className="notification-row" key={n.id}>
            <span className={`notice-icon ${n.tone}`}>
              <Icon name={n.icon} />
            </span>
            <div className="notification-copy">
              <strong>{n.title}</strong>
              <p>{n.description}</p>
            </div>
            <time>{n.time}</time>
          </div>
        ))}
      </section>
    </div>
  )
}

export function ProfilePage() {
  const { user, logout } = useAuth()
  return (
    <div className="view-stack">
      <PageHeader title="Profile & preferences" />
      <section className="panel">
        <p>
          <strong>{user?.name}</strong>
        </p>
        <p className="muted">
          {user?.email} · {user?.role}
        </p>
        <h3>Change password</h3>
        <div className="form-grid">
          <TextField label="Current password" type="password" />
          <TextField label="New password" type="password" />
        </div>
        <button className="button button-secondary" type="button" onClick={() => logout()}>
          Sign out
        </button>
      </section>
    </div>
  )
}
