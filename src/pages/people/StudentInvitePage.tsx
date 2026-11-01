import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { PageHeader } from '../../components/ui/Workflow'
import { FormActions, SelectField, TextField } from '../../components/ui/Forms'
import { formatDateTime } from '../../lib/format'
import type { CreatedInvitation, Group, PendingInvitation } from '../../types/domain'

export function StudentInvitePage() {
  const { user, can } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [invitation, setInvitation] = useState<CreatedInvitation | null>(null)
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [error, setError] = useState('')
  const [copyError, setCopyError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([api.directoryGroups(), api.pendingInvitations()])
      .then(([result, invitations]) => {
        if (active) {
          const assigned = user?.role === 'TEACHER'
            ? result.filter((group) => user.groupIds.includes(group.id))
            : result
          setGroups(assigned)
          setPendingInvitations(invitations)
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load your groups.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  if (!can('students.invite')) return <Navigate to="/403" replace />

  async function revokePendingInvitation(id: string) {
    setError('')
    try {
      await api.revokeInvitation(id)
      setPendingInvitations((current) => current.filter((pending) => pending.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke invitation.')
    }
  }

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    setError('')
    setInvitation(null)
    try {
      const created = await api.createInvitation({
        name: String(values.get('name') ?? ''),
        email: String(values.get('email') ?? ''),
        role: 'STUDENT',
        groupIds: [String(values.get('groupId') ?? '')],
      })
      setInvitation(created)
      setPendingInvitations(await api.pendingInvitations())
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not invite student.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="view-stack">
      <PageHeader title="Invite a student" subtitle="Generate a one-time registration code for a student in your assigned group." />
      {error && <p className="field-error" role="alert">{error}</p>}
      {loading ? <p className="muted">Loading groups…</p> : groups.length === 0 ? (
        <section className="panel"><p>No groups are assigned to your account. Ask an organization admin to assign your class or group first.</p></section>
      ) : (
        <form className="panel form-grid" onSubmit={(event) => void createInvitation(event)}>
          <p className="muted full-width">Generating another code for the same email and group replaces the previous code.</p>
          <TextField name="name" label="Student name" minLength={2} maxLength={120} required />
          <TextField name="email" label="Student email" type="email" required />
          <SelectField name="groupId" label="Class or group" required>
            <option value="">Select a group</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </SelectField>
          <p className="muted full-width">The student will create an account and be linked to this attendance record when they accept.</p>
          <FormActions>
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? 'Generating…' : 'Generate registration code'}
            </button>
          </FormActions>
        </form>
      )}
      {invitation && (
        <section className="panel" aria-live="polite">
          <h2>Share this student registration code</h2>
          <p>For <strong>{invitation.email}</strong>. It expires {formatDateTime(invitation.expiresAt)} and works once.</p>
          <code className="secret-box" style={{ margin: '14px 0' }}>{invitation.code}</code>
          <div className="toolbar-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={async () => {
                setCopyError('')
                try {
                  if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.')
                  await navigator.clipboard.writeText(invitation.code)
                } catch {
                  setCopyError('Could not copy the code. Select and copy it manually.')
                }
              }}
            >
              Copy code
            </button>
          </div>
          {copyError && <p className="field-error" role="alert">{copyError}</p>}
          <p className="muted" style={{ marginTop: '10px' }}>Share it privately; it cannot be viewed again after leaving this page.</p>
        </section>
      )}
      <section className="panel table-panel">
        <div className="table-toolbar">
          <h3>Pending student invitations</h3>
        </div>
        {pendingInvitations.length === 0 ? <p className="muted" style={{ padding: '20px' }}>No pending student invitations for your groups.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Expires</th><th /></tr></thead>
              <tbody>
                {pendingInvitations.map((pending) => (
                  <tr key={pending.id}>
                    <td><strong>{pending.name}</strong></td>
                    <td>{pending.email}</td>
                    <td>{formatDateTime(pending.expiresAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button className="button button-danger button-sm" type="button" onClick={() => void revokePendingInvitation(pending.id)}>
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
