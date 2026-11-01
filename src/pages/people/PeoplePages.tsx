import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { PersonSummary } from '../../components/ui/People'
import { StatusBadge } from '../../components/ui/Status'
import { AttendanceCalendar } from '../../components/ui/Cards'
import { ConsentCheckbox, FormActions, SelectField, TextField } from '../../components/ui/Forms'
import { EmptyState, PermissionGate } from '../../components/ui/Feedback'
import { PageHeader } from '../../components/ui/Workflow'
import { Icon } from '../../components/Icon'
import type { Person, PersonType } from '../../types/domain'

const personSchema = z.object({
  personCode: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  type: z.enum(['STUDENT', 'EMPLOYEE']),
  groupId: z.string().min(1),
  consentGiven: z.boolean(),
})

export function PeopleListPage() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<PersonType | 'ALL'>('ALL')
  const q = params.get('q') ?? ''
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof api.directoryGroups>>>([])
  const [rows, setRows] = useState<Person[]>([])
  const [actionError, setActionError] = useState('')
  const [queryState, setQueryState] = useState<{
    key: string
    status: 'loading' | 'success' | 'error'
    error?: string
  }>({ key: '', status: 'loading' })
  const [updatingId, setUpdatingId] = useState('')
  const queryKey = JSON.stringify([q, tab])
  const loading = queryState.key !== queryKey || queryState.status === 'loading'
  const loadError = queryState.key === queryKey && queryState.status === 'error' ? queryState.error ?? '' : ''

  useEffect(() => {
    let active = true
    Promise.all([
      api.directoryPeople({ q, type: tab === 'ALL' ? undefined : tab }),
      api.directoryGroups(),
    ]).then(([people, groupRows]) => {
      if (!active) return
      setRows(people)
      setGroups(groupRows)
      setQueryState({ key: queryKey, status: 'success' })
    }).catch((err: unknown) => {
      if (active) {
        setQueryState({
          key: queryKey,
          status: 'error',
          error: err instanceof Error ? err.message : 'Could not load people.',
        })
      }
    })
    return () => {
      active = false
    }
  }, [q, tab, queryKey])

  async function toggleStatus(person: Person) {
    setUpdatingId(person.id)
    setActionError('')
    try {
      const updated = await api.updateDirectoryPerson(person.id, {
        status: person.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      })
      setRows((current) => current.map((row) => row.id === updated.id ? updated : row))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update person.')
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <PermissionGate permission="people.view">
      <div className="view-stack">
        <PageHeader
          title="People"
          subtitle="Students and employees share one Person record. The device only stores personCode."
          actions={
            can('people.manage') ? (
              <>
                <Link className="button button-secondary" to="/people/import">
                  <Icon name="upload" /> Import CSV
                </Link>
                <Link className="button button-secondary" to="/people/enroll">
                  Enrol
                </Link>
                <Link className="button button-primary" to="/people/new">
                  <Icon name="plus" /> Add person
                </Link>
              </>
            ) : null
          }
        />
        <section className="panel table-panel">
          <div className="table-toolbar">
            <label className="table-search">
              <Icon name="search" size={16} />
              <input
                value={q}
                onChange={(e) => {
                  const next = new URLSearchParams(params)
                  if (e.target.value) next.set('q', e.target.value)
                  else next.delete('q')
                  setParams(next, { replace: true })
                }}
                placeholder="Search name, code, email"
              />
            </label>
            <div className="filter-tabs">
              {(['ALL', 'STUDENT', 'EMPLOYEE'] as const).map((t) => (
                <button
                  key={t}
                  className={tab === t ? 'active' : ''}
                  type="button"
                  onClick={() => {
                    setTab(t)
                  }}
                >
                  {t === 'ALL' ? 'All' : t === 'STUDENT' ? 'Students' : 'Employees'}
                </button>
              ))}
            </div>
            {loading && <p className="muted" role="status">Loading people…</p>}
            {(loadError || actionError) && <p className="field-error" role="alert">{loadError || actionError}</p>}
          </div>
          {!loading && !loadError && rows.length === 0 ? (
            <EmptyState title="No people match" hint="Try another tab or clear the search." />
          ) : !loading && !loadError && rows.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Group</th>
                    <th>Status</th>
                    <th>Consent</th>
                    {can('people.manage') && <th />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/people/${p.id}`}>
                          <PersonSummary name={p.name} sub={p.email} />
                        </Link>
                      </td>
                      <td className="mono">{p.personCode}</td>
                      <td><span className="department-tag">{p.type}</span></td>
                      <td>
                        <span className="department-tag">{groups.find((g) => g.id === p.groupId)?.name ?? '—'}</span>
                      </td>
                      <td>
                        <StatusBadge value={p.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE_PERSON'} />
                      </td>
                      <td>
                        <span className={`status-pill ${p.consentGiven ? 'present' : 'absent'}`}>
                          {p.consentGiven ? 'Yes' : 'No'}
                        </span>
                      </td>
                      {can('people.manage') && (
                        <td>
                          <div className="table-actions">
                            <button
                              className={`button button-sm ${p.status === 'ACTIVE' ? 'button-danger' : 'button-secondary'}`}
                              type="button"
                              disabled={updatingId === p.id}
                              onClick={() => void toggleStatus(p)}
                            >
                              {updatingId === p.id ? 'Saving…' : p.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </PermissionGate>
  )
}

export function PersonDetailPage() {
  const { can } = useAuth()
  const { id } = useParams()
  const [person, setPerson] = useState<Person | null>(null)
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof api.directoryGroups>>>([])
  const [history, setHistory] = useState<Awaited<ReturnType<typeof api.personAttendance>>>([])
  const [leave, setLeave] = useState<Awaited<ReturnType<typeof api.directoryLeave>>>([])
  const [audit, setAudit] = useState<Awaited<ReturnType<typeof api.directoryAudit>>>([])
  const [loadError, setLoadError] = useState('')
  useEffect(() => {
    if (!id) return
    let active = true
    Promise.all([
      api.directoryPerson(id),
      api.directoryGroups(),
      api.personAttendance(id),
      api.directoryLeave(),
      can('audit.view') ? api.directoryAudit() : Promise.resolve([]),
    ])
      .then(([nextPerson, nextGroups, nextHistory, nextLeave, nextAudit]) => {
        if (!active) return
        setPerson(nextPerson)
        setGroups(nextGroups)
        setHistory(nextHistory)
        setLeave(nextLeave.filter((item) => item.personId === id))
        setAudit(nextAudit.filter((item) => item.entity.includes(id) || item.entity.includes(nextPerson.personCode)))
      })
      .catch((err: unknown) => {
        if (active) setLoadError(err instanceof Error ? err.message : 'Could not load person.')
      })
    return () => {
      active = false
    }
  }, [id, can])
  const heat = history.slice(0, 30).map((record) => ({ date: record.date, status: record.status }))

  if (loadError) {
    return <EmptyState title="Could not load person" hint={loadError} />
  }
  if (!person) {
    return <EmptyState title="Loading person…" />
  }

  return (
    <PermissionGate permission="people.view">
      <div className="view-stack">
        <PageHeader
          title={person.name}
          subtitle={`${person.personCode} · ${groups.find((g) => g.id === person.groupId)?.name ?? ''}`}
          actions={
            <Link className="button button-secondary" to="/people">
              Back to directory
            </Link>
          }
        />
        <div className="dashboard-grid dashboard-primary-grid">
          <section className="panel">
            <h3 style={{ margin: '0 0 10px' }}>Profile information</h3>
            <p style={{ margin: '0 0 6px' }}>
              <strong>{person.email}</strong> · {person.phone}
            </p>
            <p className="muted" style={{ margin: '0 0 10px' }}>
              {person.type === 'STUDENT'
                ? `Roll ${person.rollNumber} · Sem ${person.semester}`
                : `${person.designation} · ${person.employeeId}`}
            </p>
            <p style={{ margin: '0 0 20px' }}>
              Consent:{' '}
              <span className={`status-pill ${person.consentGiven ? 'present' : 'absent'}`}>
                {person.consentGiven ? 'Recorded' : 'Missing'}
              </span>
            </p>
            <h3 style={{ margin: '0 0 12px' }}>Attendance heatmap</h3>
            <AttendanceCalendar days={heat} />
          </section>
          <section className="panel">
            <h3 style={{ margin: '0 0 10px' }}>Device enrollment</h3>
            <p className="muted">No enrollment state is simulated. Confirm device commands and acknowledgements before enrolling.</p>
          </section>
        </div>
        <section className="panel table-panel">
          <div className="table-toolbar">
            <h3>Attendance history</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>First in</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>
                      <StatusBadge value={r.status} />
                    </td>
                    <td>{r.firstIn ? new Date(r.firstIn).toLocaleTimeString() : '—'}</td>
                    <td><span className="department-tag">{r.source}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h3 style={{ margin: '0 0 10px' }}>Leave requests</h3>
          {leave.length === 0 && <p className="muted">No leave on file.</p>}
          {leave.map((l) => (
            <p key={l.id} style={{ margin: '6px 0' }}>
              {l.from} → {l.to} · {l.type} · <StatusBadge value={l.status === 'APPROVED' ? 'EXCUSED' : 'QUEUED'} />
            </p>
          ))}
          <h3 style={{ margin: '20px 0 10px' }}>Recent activity & audit</h3>
          {audit.length === 0 && <p className="muted">No audit rows for this person yet.</p>}
          {audit.map((a) => (
            <p key={a.id} className="muted" style={{ margin: '6px 0' }}>
              {a.action} · {a.detail}
            </p>
          ))}
        </section>
      </div>
    </PermissionGate>
  )
}

export function PersonFormPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof api.directoryGroups>>>([])
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    api.directoryGroups().then(setGroups).catch((err: unknown) => {
      setErrors({ form: err instanceof Error ? err.message : 'Could not load groups.' })
    })
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    const form = new FormData(event.currentTarget)
    const parsed = personSchema.safeParse({
      personCode: form.get('personCode'),
      name: form.get('name'),
      email: form.get('email'),
      phone: form.get('phone'),
      type: form.get('type'),
      groupId: form.get('groupId'),
      consentGiven: consent ? true : false,
    })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[issue.path[0] as string] = issue.message
      setErrors(next)
      return
    }
    const type = parsed.data.type as PersonType
    setBusy(true)
    try {
      await api.createDirectoryPerson({
        ...parsed.data,
        type,
        status: 'ACTIVE',
        consentGiven: parsed.data.consentGiven,
        rollNumber: String(form.get('rollNumber') ?? ''),
        semester: String(form.get('semester') ?? ''),
        employeeId: String(form.get('employeeId') ?? ''),
        designation: String(form.get('designation') ?? ''),
      })
      navigate('/people')
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Could not save person.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <PermissionGate permission="people.manage">
      <form className="view-stack" onSubmit={submit}>
        <PageHeader
          title="Add person"
          subtitle="personCode identifies this record on the AMB82-Mini; the laptop camera uses the same person record."
          actions={
            <Link className="button button-secondary" to="/people">
              Cancel
            </Link>
          }
        />
        {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
        <section className="panel form-grid">
          <TextField name="personCode" label="Person code" placeholder="STU-1010" error={errors.personCode} required />
          <TextField name="name" label="Full name" error={errors.name} required />
          <TextField name="email" label="Email" type="email" error={errors.email} required />
          <TextField name="phone" label="Phone" error={errors.phone} required />
          <SelectField name="type" label="Type" defaultValue="STUDENT">
            <option value="STUDENT">Student</option>
            <option value="EMPLOYEE">Employee</option>
          </SelectField>
          <SelectField name="groupId" label="Group" error={errors.groupId}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </SelectField>
          <TextField name="rollNumber" label="Roll number (school)" />
          <TextField name="semester" label="Semester" />
          <TextField name="employeeId" label="Employee ID (company)" />
          <TextField name="designation" label="Designation" />
          <ConsentCheckbox checked={consent} onChange={setConsent} />
          {errors.consent && <p className="field-error full-width">{errors.consent}</p>}
          <FormActions>
            <button className="button button-primary" type="submit" disabled={busy || groups.length === 0}>
              {busy ? 'Saving…' : 'Save person'}
            </button>
            <Link className="button button-secondary" to="/people">
              Cancel
            </Link>
          </FormActions>
        </section>
      </form>
    </PermissionGate>
  )
}

export function EnrollmentWizardPage() {
  return (
    <PermissionGate permission="people.manage">
      <div className="view-stack">
        <PageHeader
          title="Enrollment unavailable"
          subtitle="Enrollment is disabled until device authentication and acknowledgement behavior are validated against firmware."
          actions={
            <Link className="button button-secondary" to="/people">
              Back to directory
            </Link>
          }
        />
        <section className="panel">
          <p className="muted">No fake capture timer or success state is used. Once the protocol is approved, enrollment will require active person status, current consent, group scope, and authenticated device acknowledgement.</p>
        </section>
      </div>
    </PermissionGate>
  )
}

export function ImportPage() {
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState('')
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof api.directoryGroups>>>([])
  const [templateGroupId, setTemplateGroupId] = useState('')
  const [assignCsvToSelectedGroup, setAssignCsvToSelectedGroup] = useState(false)
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof api.previewPeopleImport>> | null>(null)
  const [error, setError] = useState('')
  const [groupsError, setGroupsError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())

  useEffect(() => {
    let active = true
    api.directoryGroups().then((result) => {
      if (!active) return
      setGroups(result)
      setTemplateGroupId(result[0]?.id ?? '')
    }).catch((err: unknown) => {
      if (active) setGroupsError(err instanceof Error ? err.message : 'Could not load groups.')
    }).finally(() => {
      if (active) setGroupsLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  function updateCsv(nextCsv: string, nextFileName = '') {
    setCsv(nextCsv)
    setFileName(nextFileName)
    setPreview(null)
    setMessage('')
    setError('')
    setIdempotencyKey(crypto.randomUUID())
  }

  async function loadCsvFile(file: File | undefined) {
    if (!file) return
    updateCsv('')
    setBusy(true)
    try {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Choose a .csv file. Excel workbooks (.xlsx) are not supported.')
        return
      }
      if (file.size > 2_000_000) {
        setError('The CSV file must be no larger than 2 MB.')
        return
      }
      const contents = await file.text()
      if (!contents.trim()) {
        setError('The selected CSV file is empty.')
        return
      }
      updateCsv(contents, file.name)
    } catch (err) {
      setError(err instanceof Error ? `Could not read the selected CSV file: ${err.message}` : 'Could not read the selected CSV file.')
    } finally {
      setBusy(false)
    }
  }

  function downloadCsvTemplate() {
    if (!templateGroupId) return
    const headers = 'personCode,name,type,groupId,email,phone,rollNumber,semester,employeeId,designation,consentGiven'
    const blankPerson = `,,,${templateGroupId},,,,,,,`
    const blob = new Blob([`\uFEFF${headers}\r\n${blankPerson}\r\n`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'people-import-template.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function validateCsv() {
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const result = await api.previewPeopleImport(
        csv,
        assignCsvToSelectedGroup ? templateGroupId : undefined,
      )
      setPreview(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not validate the CSV.')
      setPreview(null)
    } finally {
      setBusy(false)
    }
  }

  async function commitCsv() {
    if (!preview || preview.invalidCount > 0) return
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const result = await api.commitPeopleImport(
        csv,
        idempotencyKey,
        assignCsvToSelectedGroup ? templateGroupId : undefined,
      )
      setMessage(`Imported ${result.created} people. Skipped ${result.skipped} duplicates.`)
      setPreview(null)
      setCsv('')
      setFileName('')
      setIdempotencyKey(crypto.randomUUID())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import people.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PermissionGate permission="people.manage">
      <div className="view-stack">
        <PageHeader
          title="Bulk import"
          subtitle="Upload, map columns, preview errors, then confirm."
          actions={
            <Link className="button button-secondary" to="/people">
              Back to directory
            </Link>
          }
        />
        <section className="panel">
          <p className="muted import-intro">
            Upload a comma-separated <code>.csv</code> file, review every row, then confirm the import. Files may contain up to 5,000 people and must be 2 MB or smaller.
          </p>
          {groupsLoading ? (
            <p className="muted" role="status">Loading organization groups…</p>
          ) : groupsError ? (
            <p className="field-error" role="alert">{groupsError}</p>
          ) : groups.length === 0 ? (
            <div className="import-no-groups" role="status">
              <p>This organization has no active groups yet. Create a group before importing people because every row needs a group.</p>
              <Link className="button button-secondary" to="/organization/groups">Create a group</Link>
            </div>
          ) : (
            <>
              <div className="import-group-tools">
                <label className="form-field">
                  <span>Group for template and optional import assignment</span>
                  <select value={templateGroupId} onChange={(event) => {
                    setTemplateGroupId(event.target.value)
                    setPreview(null)
                  }}>
                    {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                </label>
                <button className="button button-secondary" type="button" onClick={downloadCsvTemplate}>
                  Download CSV template
                </button>
              </div>
              <label className="import-assign-group">
                <input
                  type="checkbox"
                  checked={assignCsvToSelectedGroup}
                  onChange={(event) => {
                    setAssignCsvToSelectedGroup(event.target.checked)
                    setPreview(null)
                  }}
                />
                <span>Assign every CSV row to <strong>{groups.find((group) => group.id === templateGroupId)?.name}</strong>, ignoring the CSV’s <code>groupId</code> values</span>
              </label>
              <details className="import-groups">
                <summary>View active group IDs for your CSV</summary>
                <ul>
                  {groups.map((group) => (
                    <li key={group.id}><span>{group.name}</span><code>{group.id}</code></li>
                  ))}
                </ul>
              </details>
              <label className="import-file-picker" htmlFor="people-csv-file">
                <span className="import-file-icon" aria-hidden="true">↑</span>
                <strong>{fileName || 'Choose a CSV file to upload'}</strong>
                <span>{fileName ? 'Choose a different file' : 'Click to browse · .csv files only · up to 2 MB'}</span>
                <input
                  id="people-csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy}
                  onChange={(event) => {
                    void loadCsvFile(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </label>
              <details className="import-paste">
                <summary>Or paste CSV text instead</summary>
                <label className="form-field">
                  <span>CSV data</span>
                  <textarea
                    rows={6}
                    value={fileName ? '' : csv}
                    placeholder={`personCode,name,type,groupId\r\nEMP-1099,Example Name,EMPLOYEE,${templateGroupId}`}
                    disabled={Boolean(fileName)}
                    onChange={(event) => updateCsv(event.target.value)}
                  />
                </label>
                {fileName && <p className="muted">A file is selected. Choose another file above to replace it, or remove it to paste CSV text.</p>}
                {fileName && (
                  <button className="button button-secondary button-sm" type="button" onClick={() => updateCsv('')}>
                    Remove selected file
                  </button>
                )}
              </details>
              <p className="muted import-columns">
                Required columns: <code>personCode</code>, <code>name</code>, <code>groupId</code>. Optional: <code>type</code>, <code>email</code>, <code>phone</code>, <code>rollNumber</code>, <code>semester</code>, <code>employeeId</code>, <code>designation</code>, <code>consentGiven</code>. The template includes a blank row—fill it in and copy it for each person.
              </p>
            </>
          )}
          {error && <p className="field-error" role="alert">{error}</p>}
          {message && (
            <div className="import-success" role="status">
              <p className="muted" style={{ color: 'var(--green)' }}>{message}</p>
              <Link className="button button-primary" to="/people/enroll">Continue to face enrollment</Link>
            </div>
          )}
          <FormActions>
            <button className="button button-secondary" type="button" disabled={busy || groupsLoading || groups.length === 0 || !csv.trim()} onClick={() => void validateCsv()}>
              {busy ? 'Checking…' : 'Validate CSV'}
            </button>
          </FormActions>
          {preview && (
            <div style={{ marginTop: '24px' }}>
              <p style={{ fontWeight: 600, marginBottom: '12px' }}>
                {preview.validCount} valid · {preview.invalidCount} invalid of {preview.totalRows} rows
              </p>
              {assignCsvToSelectedGroup && (
                <p className="muted" role="status">
                  All imported people will be assigned to {groups.find((group) => group.id === templateGroupId)?.name}.
                </p>
              )}
              <div className="table-wrap panel table-panel">
                <table>
                  <thead>
                    <tr><th>Row</th><th>Code</th><th>Name</th><th>Type</th><th>Validation</th></tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.row}>
                        <td>{row.row}</td>
                        <td className="mono">{row.data.personCode}</td>
                        <td><strong>{row.data.name}</strong></td>
                        <td><span className="department-tag">{row.data.type}</span></td>
                        <td>
                          {row.errors.length ? (
                            <span className="field-error">{row.errors.join(' ')}</span>
                          ) : (
                            <span className="status-pill present">Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <FormActions style={{ marginTop: '16px' }}>
                <button className="button button-primary" type="button" disabled={busy || preview.invalidCount > 0} onClick={() => void commitCsv()}>
                  {busy ? 'Importing…' : 'Confirm import'}
                </button>
              </FormActions>
            </div>
          )}
        </section>
      </div>
    </PermissionGate>
  )
}
