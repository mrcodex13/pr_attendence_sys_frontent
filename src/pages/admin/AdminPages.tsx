import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { PermissionGate } from '../../components/ui/Feedback'
import { PageHeader } from '../../components/ui/Workflow'
import { FormActions, SelectField, TextField } from '../../components/ui/Forms'
import { formatDateTime } from '../../lib/format'
import { Icon } from '../../components/Icon'
import type { CreatedInvitation, ManagedOrganization, PendingInvitation, User } from '../../types/domain'

function InvitationCode({ email, code, expiresAt }: { email: string; code: string; expiresAt: string }) {
  const [copyError, setCopyError] = useState('')
  return (
    <section className="panel" aria-live="polite">
      <h2>Share this registration code</h2>
      <p>For <strong>{email}</strong>. It can be used once and expires {formatDateTime(expiresAt)}.</p>
      <code className="secret-box" style={{ margin: '14px 0' }} aria-label="One-time registration code">{code}</code>
      <div className="toolbar-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={async () => {
            setCopyError('')
            try {
              if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.')
              await navigator.clipboard.writeText(code)
            } catch {
              setCopyError('Could not copy the code. Select and copy it manually.')
            }
          }}
        >
          Copy code
        </button>
      </div>
      {copyError && <p className="field-error" role="alert">{copyError}</p>}
      <p className="muted" style={{ marginTop: '10px' }}>Share it privately. It cannot be viewed again after leaving this page.</p>
    </section>
  )
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof api.directoryGroups>>>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [invitation, setInvitation] = useState<CreatedInvitation | null>(null)
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([api.adminUsers(), api.directoryGroups(), api.pendingInvitations()])
      .then(([nextUsers, nextGroups, nextInvitations]) => {
        if (active) {
          setUsers(nextUsers)
          setGroups(nextGroups)
          setPendingInvitations(nextInvitations)
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load users.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function createUserInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedGroupIds.length === 0) {
      setError('Choose at least one group for this staff member.')
      return
    }
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const created = await api.createInvitation({
        name: String(values.get('name') ?? ''),
        email: String(values.get('email') ?? ''),
        role: String(values.get('role') ?? 'TEACHER') as CreatedInvitation['role'],
        groupIds: selectedGroupIds,
      })
      setInvitation(created)
      setPendingInvitations(await api.pendingInvitations())
      setMessage(`Created a one-time registration code for ${created.email}.`)
      form.reset()
      setSelectedGroupIds([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create user.')
    } finally {
      setBusy(false)
    }
  }

  async function revokePendingInvitation(id: string) {
    setError('')
    try {
      await api.revokeInvitation(id)
      setPendingInvitations((current) => current.filter((invitation) => invitation.id !== id))
      setMessage('Invitation revoked. Generate a new code to invite this person again.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke invitation.')
    }
  }

  return (
    <PermissionGate permission="users.manage">
      <div className="view-stack">
        <PageHeader title="Users & roles" subtitle="Organization admins create staff accounts and assign their groups." />
        {error && <p className="field-error" role="alert">{error}</p>}
        {message && <p className="muted" role="status">{message}</p>}
        <form className="panel form-grid" onSubmit={(event) => void createUserInvitation(event)}>
          <h2 className="form-section-title">Invite staff</h2>
          <p className="muted full-width">Generating another code for the same email, role, and groups replaces the previous code. Revoke first to change assignments.</p>
          <TextField name="name" label="Full name" minLength={2} required />
          <TextField name="email" label="Email" type="email" required />
          <SelectField name="role" label="Role" defaultValue="TEACHER">
            <option value="TEACHER">Teacher</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </SelectField>
          <fieldset className="form-field group-selection full-width" aria-describedby="group-selection-help">
            <legend>Assign groups</legend>
            {loading ? <p className="muted">Loading groups…</p> : groups.length > 0 ? (
              <div className="group-options">
                {groups.map((group) => (
                  <label className="group-option" key={group.id}>
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(group.id)}
                      onChange={(event) => {
                        setSelectedGroupIds((current) => event.target.checked
                          ? [...current, group.id]
                          : current.filter((id) => id !== group.id))
                      }}
                    />
                    <span>{group.name}</span>
                  </label>
                ))}
              </div>
            ) : error ? (
              <p className="muted">Groups could not be loaded. Reload this page before inviting staff.</p>
            ) : (
              <p className="muted">
                Create a group before inviting staff. <Link to="/organization/groups">Create a group</Link>
              </p>
            )}
            <small id="group-selection-help">
              {groups.length > 0 ? 'Select at least one group. You can choose more than one.' : ''}
            </small>
          </fieldset>
          <FormActions>
            <button className="button button-primary" type="submit" disabled={busy || loading || groups.length === 0}>
              {busy ? 'Creating…' : 'Generate registration code'}
            </button>
          </FormActions>
        </form>
        {invitation && <InvitationCode email={invitation.email} code={invitation.code} expiresAt={invitation.expiresAt} />}
        <section className="panel table-panel">
          <div className="table-toolbar">
            <h3>Pending invitations</h3>
          </div>
          {pendingInvitations.length === 0 ? <p className="muted" style={{ padding: '20px' }}>No pending invitations.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Expires</th><th /></tr></thead>
                <tbody>
                  {pendingInvitations.map((pending) => (
                    <tr key={pending.id}>
                      <td><strong>{pending.name}</strong></td>
                      <td>{pending.email}</td>
                      <td>{pending.role}</td>
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
        <section className="panel table-panel">
          <div className="table-toolbar">
            <h3>All organization staff</h3>
          </div>
          {loading && <p className="muted" role="status" style={{ padding: '20px' }}>Loading users…</p>}
          {!loading && !error && users.length === 0 && <p className="muted" style={{ padding: '20px' }}>No users found in this organization.</p>}
          {!loading && users.length > 0 && (
            <div className="table-wrap">
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
                      <td><strong>{u.name}</strong></td>
                      <td>{u.email}</td>
                      <td><span className="department-tag">{u.role}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PermissionGate>
  )
}

export function OrganizationsPage() {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<ManagedOrganization[]>([])
  const [adminInviteOrganization, setAdminInviteOrganization] = useState<ManagedOrganization | null>(null)
  const [adminPendingInvitations, setAdminPendingInvitations] = useState<Array<Pick<PendingInvitation, 'id' | 'email' | 'name' | 'expiresAt' | 'createdAt'>>>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [adminInvite, setAdminInvite] = useState<{ email: string; code: string; expiresAt: string } | null>(null)

  useEffect(() => {
    let active = true
    if (user?.role !== 'SUPER_ADMIN') {
      return () => {
        active = false
      }
    }
    api.organizations()
      .then((result) => {
        if (active) setOrganizations(result)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load organizations.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user?.role])

  if (user?.role !== 'SUPER_ADMIN') return <Navigate to="/403" replace />

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const created = await api.createOrganization({
        name: String(values.get('name') ?? ''),
        slug: String(values.get('slug') ?? ''),
        mode: String(values.get('mode') ?? 'SCHOOL') as ManagedOrganization['mode'],
        adminName: String(values.get('adminName') ?? ''),
        adminEmail: String(values.get('adminEmail') ?? ''),
      })
      setOrganizations((current) => [created.organization, ...current])
      setAdminInvite(created.adminInvite)
      setAdminInviteOrganization(null)
      setMessage(`${created.organization.name} created. Share the one-time registration code with its admin.`)
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create organization.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleOrganization(organization: ManagedOrganization) {
    const status = organization.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setError('')
    setMessage('')
    try {
      const updated = await api.setOrganizationStatus(organization.id, status)
      setOrganizations((current) => current.map((item) => item.id === updated.id ? updated : item))
      setMessage(`${updated.name} ${status === 'ACTIVE' ? 'reactivated' : 'deactivated'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update organization status.')
    }
  }

  async function createAdminInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!adminInviteOrganization) return
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    setError('')
    setAdminInvite(null)
    try {
      const invite = await api.createOrganizationAdminInvitation(adminInviteOrganization.id, {
        name: String(values.get('adminName') ?? ''),
        email: String(values.get('adminEmail') ?? ''),
      })
      setAdminInvite(invite)
      setAdminPendingInvitations(await api.organizationAdminInvitations(adminInviteOrganization.id))
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create organization admin invitation.')
    } finally {
      setBusy(false)
    }
  }

  async function openAdminInvitations(organization: ManagedOrganization) {
    setAdminInviteOrganization(organization)
    setAdminInvite(null)
    setError('')
    try {
      setAdminPendingInvitations(await api.organizationAdminInvitations(organization.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load admin invitations.')
    }
  }

  async function revokeAdminInvitation(id: string) {
    if (!adminInviteOrganization) return
    setError('')
    try {
      await api.revokeOrganizationAdminInvitation(adminInviteOrganization.id, id)
      setAdminPendingInvitations((current) => current.filter((invitation) => invitation.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke admin invitation.')
    }
  }

  return (
    <div className="view-stack">
      <PageHeader
        title="Platform organizations"
        subtitle="Manage every registered organization, create new workspaces, and invite organization admins."
      />
      {error && <p className="field-error" role="alert">{error}</p>}
      {message && <p className="muted" role="status">{message}</p>}
      <form className="panel form-grid" onSubmit={(event) => void createOrganization(event)}>
        <h2 className="form-section-title">Create organization</h2>
        <TextField name="name" label="Organization name" minLength={2} maxLength={120} required />
        <TextField
          name="slug"
          label="URL slug"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          title="Use lowercase letters, numbers, and hyphens."
          required
        />
        <SelectField name="mode" label="Organization type" defaultValue="SCHOOL">
          <option value="SCHOOL">School</option>
          <option value="COMPANY">Company</option>
          <option value="BOTH">School and company</option>
        </SelectField>
        <TextField name="adminName" label="Initial admin name" minLength={2} required />
        <TextField name="adminEmail" label="Initial admin email" type="email" required />
        <p className="muted full-width">The initial admin will use a one-time code to register and choose their own password.</p>
        <FormActions>
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create organization and registration code'}
          </button>
        </FormActions>
      </form>
      {adminInvite && (
        <InvitationCode email={adminInvite.email} code={adminInvite.code} expiresAt={adminInvite.expiresAt} />
      )}
      {adminInviteOrganization && (
        <>
          <form className="panel form-grid" onSubmit={(event) => void createAdminInvitation(event)}>
            <h2 className="full-width">Invite admin to {adminInviteOrganization.name}</h2>
            <TextField name="adminName" label="Admin name" minLength={2} required />
            <TextField name="adminEmail" label="Admin email" type="email" required />
            <p className="muted full-width">Using an email with an active invite replaces its previous code.</p>
            <FormActions>
              <button className="button button-primary" type="submit" disabled={busy}>
                {busy ? 'Generating…' : 'Generate or replace admin registration code'}
              </button>
              <button className="button button-secondary" type="button" onClick={() => setAdminInviteOrganization(null)}>
                Cancel
              </button>
            </FormActions>
          </form>
          <section className="panel table-panel">
            <div className="table-toolbar">
              <h3>Pending admin invitations</h3>
            </div>
            {adminPendingInvitations.length === 0 ? <p className="muted" style={{ padding: '20px' }}>No pending admin invitations.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Expires</th><th /></tr></thead>
                  <tbody>
                    {adminPendingInvitations.map((pending) => (
                      <tr key={pending.id}>
                        <td><strong>{pending.name}</strong></td>
                        <td>{pending.email}</td>
                        <td>{formatDateTime(pending.expiresAt)}</td>
                        <td>
                          <div className="table-actions">
                            <button className="button button-danger button-sm" type="button" onClick={() => void revokeAdminInvitation(pending.id)}>
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
        </>
      )}
      <section className="panel table-panel">
        <div className="table-toolbar">
          <h3>All organizations</h3>
        </div>
        {loading && <p className="muted" role="status" style={{ padding: '20px' }}>Loading organizations…</p>}
        {!loading && !error && organizations.length === 0 && <p className="muted" style={{ padding: '20px' }}>No organizations found.</p>}
        {organizations.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((organization) => {
                  return (
                    <tr key={organization.id}>
                      <td><strong>{organization.name}</strong></td>
                      <td>{organization.mode}</td>
                      <td className="mono">{organization.slug}</td>
                      <td>
                        <span className={`status-pill ${organization.status === 'ACTIVE' ? 'present' : 'absent'}`}>
                          {organization.status}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="button button-secondary button-sm"
                            type="button"
                            disabled={organization.status !== 'ACTIVE'}
                            onClick={() => void openAdminInvitations(organization)}
                          >
                            Manage invites
                          </button>
                          <button
                            className={`button button-sm ${organization.status === 'ACTIVE' ? 'button-danger' : 'button-secondary'}`}
                            type="button"
                            onClick={() => void toggleOrganization(organization)}
                          >
                            {organization.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', margin: 0, fontSize: '12px' }}>
          Deactivation blocks sign-in and preserves organization data. The organization can be reactivated later.
        </p>
      </section>
    </div>
  )
}

export function SettingsPage() {
  const [current, setCurrent] = useState<Awaited<ReturnType<typeof api.directorySettings>> | null>(null)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    api.directorySettings()
      .then(setCurrent)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load organization settings.'))
  }, [])
  return (
    <PermissionGate permission="settings.manage">
      <form
        className="view-stack"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!current) return
          const form = new FormData(e.currentTarget)
          setBusy(true)
          setError('')
          try {
            const updated = await api.saveDirectorySettings({
              name: String(form.get('name')),
              mode: String(form.get('mode')) as typeof current.mode,
              timezone: String(form.get('timezone')),
              graceMinutes: Number(form.get('graceMinutes')),
              debounceSeconds: Number(form.get('debounceSeconds')),
              minConfidence: Number(form.get('minConfidence')),
              retentionDays: Number(form.get('retentionDays')),
            })
            setCurrent(updated)
            setSaved('Settings saved successfully.')
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save settings.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <PageHeader title="Organization settings" subtitle="Mode, timezone, grace, debounce, minimum confidence, retention." />
        {error && <p className="field-error" role="alert">{error}</p>}
        {saved && <p className="muted" role="status">{saved}</p>}
        {!current ? <p className="muted">Loading settings…</p> : (
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
            <FormActions>
              <button className="button button-primary" type="submit" disabled={busy || !current}>
                {busy ? 'Saving…' : 'Save settings'}
              </button>
            </FormActions>
          </section>
        )}
      </form>
    </PermissionGate>
  )
}

export function AuditPage() {
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof api.directoryAudit>>>([])
  const [error, setError] = useState('')
  useEffect(() => {
    api.directoryAudit()
      .then(setLogs)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load audit history.'))
  }, [])
  return (
    <PermissionGate permission="audit.view">
      <div className="view-stack">
        <PageHeader title="Audit log" subtitle="Every correction and enrolment start is traceable." />
        <section className="panel table-panel">
          <div className="table-toolbar">
            <h3>Audit records</h3>
          </div>
          {error && <p className="field-error" role="alert" style={{ padding: '14px 20px' }}>{error}</p>}
          <div className="table-wrap">
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
                    <td><strong>{l.actor}</strong></td>
                    <td className="mono">{l.action}</td>
                    <td>{l.entity}</td>
                    <td>{l.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PermissionGate>
  )
}

export function PrivacyPage() {
  const [people, setPeople] = useState<Awaited<ReturnType<typeof api.directoryPeople>>>([])
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof api.directoryDeletionRequests>>>([])
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all([api.directoryPeople(), api.directoryDeletionRequests()])
      .then(([nextPeople, nextRequests]) => {
        setPeople(nextPeople)
        setRequests(nextRequests)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load privacy requests.'))
  }, [])
  async function requestDeletion(personId: string) {
    setError('')
    try {
      const created = await api.createDirectoryDeletionRequest(personId, 'Privacy deletion request submitted for review.')
      setRequests((current) => [...current, {
        id: created.id,
        personId,
        status: created.status,
        reason: 'Privacy deletion request submitted for review.',
      }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create deletion request.')
    }
  }
  async function reviewDeletionRequest(id: string, status: 'APPROVED' | 'REJECTED') {
    setError('')
    try {
      const updated = await api.reviewDirectoryDeletionRequest(id, status, 'Reviewed in organization privacy settings.')
      setRequests((current) => current.map((request) => request.id === id ? { ...request, status: updated.status } : request))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not review deletion request.')
    }
  }
  return (
    <PermissionGate permission="privacy.manage">
      <div className="view-stack">
        <PageHeader title="Privacy & consent" subtitle="Face templates stay on the device. Support deletion requests." />
        {error && <p className="field-error" role="alert">{error}</p>}
        <section className="panel table-panel">
          <div className="table-toolbar">
            <h3>Consent records & privacy requests</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Consent</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>
                      <span className={`status-pill ${p.consentGiven ? 'present' : 'absent'}`}>
                        {p.consentGiven ? 'Recorded' : 'Missing'}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const request = requests.find((item) => item.personId === p.id && ['REQUESTED', 'APPROVED', 'DEVICE_PENDING'].includes(item.status))
                        if (!request) return (
                          <div className="table-actions">
                            <button className="button button-secondary button-sm" type="button" onClick={() => void requestDeletion(p.id)}>
                              Request deletion
                            </button>
                          </div>
                        )
                        if (request.status !== 'REQUESTED') return <span className="muted">Request {request.status.toLowerCase()}</span>
                        return (
                          <div className="table-actions">
                            <button className="button button-primary button-sm" type="button" onClick={() => void reviewDeletionRequest(request.id, 'APPROVED')}>
                              Approve
                            </button>
                            <button className="button button-danger button-sm" type="button" onClick={() => void reviewDeletionRequest(request.id, 'REJECTED')}>
                              Reject
                            </button>
                          </div>
                        )
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PermissionGate>
  )
}

export function NotificationsPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof api.directoryNotifications>>>([])
  const [error, setError] = useState('')
  useEffect(() => {
    api.directoryNotifications()
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load notifications.'))
  }, [])
  async function markRead(id: string) {
    setError('')
    try {
      await api.markDirectoryNotifications([id], true)
      setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark notification as read.')
    }
  }
  return (
    <div className="view-stack">
      <PageHeader title="Notifications" />
      {error && <p className="field-error" role="alert">{error}</p>}
      <section className="notification-panel panel">
        {items.length === 0 ? <p className="muted">No notifications yet.</p> : items.map((n) => (
          <button
            className="notification-row"
            key={n.id}
            type="button"
            onClick={() => !n.read && void markRead(n.id)}
            aria-label={`${n.read ? 'Read' : 'Mark read'} notification: ${n.title}`}
          >
            <span className={`notice-icon ${n.tone}`}>
              <Icon name={n.icon} />
            </span>
            <div className="notification-copy">
              <strong>{n.title}</strong>
              <p>{n.description}</p>
            </div>
            <time>{n.time}</time>
          </button>
        ))}
      </section>
    </div>
  )
}

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    const form = new FormData(event.currentTarget)
    const currentPassword = String(form.get('currentPassword') ?? '')
    const newPassword = String(form.get('newPassword') ?? '')
    const confirmPassword = String(form.get('confirmPassword') ?? '')
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      setMessage('Password changed. Please sign in again.')
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    setError('')
    try {
      await logout()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke the current session.')
    }
  }

  return (
    <div className="view-stack">
      <PageHeader title="Profile & preferences" />
      <section className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px' }}>{user?.name}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {user?.email} · <span className="department-tag">{user?.role}</span>
            </p>
          </div>
          <button className="button button-danger button-sm" type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '20px 0' }} />
        <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>Change password</h3>
        <p className="muted" style={{ margin: '0 0 16px' }}>Use at least 12 characters with letters, numbers, and symbols.</p>
        {error && <p className="field-error" role="alert">{error}</p>}
        {message && <p className="muted" style={{ color: 'var(--green)' }}>{message}</p>}
        <form className="form-grid" style={{ padding: 0 }} onSubmit={changePassword}>
          <TextField name="currentPassword" label="Current password" type="password" autoComplete="current-password" required />
          <TextField name="newPassword" label="New password" type="password" autoComplete="new-password" minLength={12} required />
          <TextField name="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" minLength={12} required />
          <FormActions>
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? 'Updating…' : 'Change password'}
            </button>
          </FormActions>
        </form>
      </section>
    </div>
  )
}
