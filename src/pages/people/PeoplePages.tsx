import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { PersonSummary } from '../../components/ui/People'
import { StatusBadge } from '../../components/ui/Status'
import { AttendanceCalendar } from '../../components/ui/Cards'
import { ConsentCheckbox, SelectField, TextField } from '../../components/ui/Forms'
import { EmptyState, PermissionGate } from '../../components/ui/Feedback'
import { EnrollmentProgress, PageHeader, Stepper } from '../../components/ui/Workflow'
import { Icon } from '../../components/Icon'
import type { Person, PersonType } from '../../types/domain'

const personSchema = z.object({
  personCode: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  type: z.enum(['STUDENT', 'EMPLOYEE']),
  groupId: z.string().min(1),
  consentGiven: z.literal(true),
})

export function PeopleListPage() {
  const { user, can } = useAuth()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<PersonType | 'ALL'>('ALL')
  const [q, setQ] = useState(params.get('q') ?? '')
  const groups = api.groups()
  const rows = api.people().filter((p) => {
    if (user?.role === 'TEACHER' || user?.role === 'MANAGER') {
      if (!user.groupIds.includes(p.groupId)) return false
    }
    if (tab !== 'ALL' && p.type !== tab) return false
    const hay = `${p.name} ${p.personCode} ${p.email}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  return (
    <PermissionGate permission="people.view">
      <div className="view-stack polished-page">
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
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, email" />
            </label>
            <div className="filter-tabs">
              {(['ALL', 'STUDENT', 'EMPLOYEE'] as const).map((t) => (
                <button key={t} className={tab === t ? 'active' : ''} type="button" onClick={() => setTab(t)}>
                  {t === 'ALL' ? 'All' : t === 'STUDENT' ? 'Students' : 'Employees'}
                </button>
              ))}
            </div>
          </div>
          {rows.length === 0 ? (
            <EmptyState title="No people match" hint="Try another tab or clear the search." />
          ) : (
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
                      <td>{p.type}</td>
                      <td>
                        <span className="department-tag">{groups.find((g) => g.id === p.groupId)?.name}</span>
                      </td>
                      <td>
                        <StatusBadge value={p.status === 'ACTIVE' ? 'PRESENT' : 'INACTIVE_PERSON'} />
                      </td>
                      <td>{p.consentGiven ? 'Yes' : 'No'}</td>
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

export function PersonDetailPage() {
  const { id } = useParams()
  const person = id ? api.person(id) : undefined
  const groups = api.groups()
  const devices = api.devices()
  const enrollments = api.enrollments().filter((e) => e.personId === id)
  const history = api.records().filter((r) => r.personId === id)
  const heat = id ? api.heatFor(id) : []
  const leave = api.leave().filter((l) => l.personId === id)
  const audit = api.audit().filter((a) => person && a.entity.includes(person.personCode))

  if (!person) {
    return <EmptyState title="Person not found" hint="They may have been removed." />
  }

  return (
    <PermissionGate permission="people.view">
      <div className="view-stack">
        <PageHeader
          title={person.name}
          subtitle={`${person.personCode} · ${groups.find((g) => g.id === person.groupId)?.name ?? ''}`}
          actions={
            <Link className="button button-primary" to={`/people/enroll?person=${person.id}`}>
              Enrol on a device
            </Link>
          }
        />
        <div className="dashboard-grid dashboard-primary-grid">
          <section className="panel">
            <h3>Profile</h3>
            <p>
              {person.email} · {person.phone}
            </p>
            <p className="muted">
              {person.type === 'STUDENT'
                ? `Roll ${person.rollNumber} · Sem ${person.semester}`
                : `${person.designation} · ${person.employeeId}`}
            </p>
            <p>Consent: {person.consentGiven ? 'recorded' : 'missing'}</p>
            <h3>Attendance heatmap</h3>
            <AttendanceCalendar days={heat} />
          </section>
          <section className="panel">
            <h3>Enrolment per device</h3>
            {devices.map((d) => {
              const row = enrollments.find((e) => e.deviceId === d.id)
              return (
                <div className="feed-row" key={d.id}>
                  <span className="feed-copy">
                    <strong>{d.name}</strong>
                    <small>{d.deviceCode}</small>
                  </span>
                  <StatusBadge value={row?.status ?? 'UNKNOWN'} />
                </div>
              )
            })}
          </section>
        </div>
        <section className="panel table-panel">
          <div className="table-toolbar">
            <h3>History</h3>
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
                    <td>{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h3>Leave</h3>
          {leave.length === 0 && <p className="muted">No leave on file.</p>}
          {leave.map((l) => (
            <p key={l.id}>
              {l.from} → {l.to} · {l.type} · {l.status}
            </p>
          ))}
          <h3>Activity</h3>
          {audit.length === 0 && <p className="muted">No audit rows for this person yet.</p>}
          {audit.map((a) => (
            <p key={a.id} className="muted">
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
  const groups = api.groups()
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
      if (!consent) next.consent = 'Consent is required before enrolment.'
      setErrors(next)
      return
    }
    const type = parsed.data.type as PersonType
    api.addPerson({
      ...parsed.data,
      type,
      status: 'ACTIVE',
      consentGiven: true,
      rollNumber: String(form.get('rollNumber') ?? ''),
      semester: String(form.get('semester') ?? ''),
      employeeId: String(form.get('employeeId') ?? ''),
      designation: String(form.get('designation') ?? ''),
    })
    navigate('/people')
  }

  return (
    <PermissionGate permission="people.manage">
      <form className="view-stack" onSubmit={submit}>
        <PageHeader title="Add person" subtitle="personCode is the label stored on the AMB82-Mini." />
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
          <label className="form-field">
            <span>Profile photo (optional)</span>
            <input type="file" accept="image/*" />
          </label>
        </section>
        <ConsentCheckbox checked={consent} onChange={setConsent} />
        {errors.consent && <p className="field-error">{errors.consent}</p>}
        <button className="button button-primary" type="submit">
          Save person
        </button>
      </form>
    </PermissionGate>
  )
}

export function EnrollmentWizardPage() {
  const [params] = useSearchParams()
  const people = api.people()
  const devices = api.devices()
  const [step, setStep] = useState(0)
  const [personId, setPersonId] = useState(params.get('person') ?? people[0]?.id ?? '')
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? '')
  const [phase, setPhase] = useState<'idle' | 'capture' | 'success' | 'fail'>('idle')
  const enrollment = useMemo(() => api.enrollments().find((e) => e.personId === personId && e.deviceId === deviceId), [personId, deviceId, phase])

  function start() {
    const row = api.startEnrollment(personId, deviceId)
    setStep(2)
    setPhase('capture')
    window.setTimeout(() => {
      const ok = devices.find((d) => d.id === deviceId)?.health !== 'OFFLINE'
      api.completeEnrollment(row.id, ok)
      setPhase(ok ? 'success' : 'fail')
    }, 1800)
  }

  return (
    <PermissionGate permission="people.manage">
      <div className="view-stack">
        <PageHeader title="Enrolment wizard" subtitle="The server queues START_ENROLLMENT. Face data never leaves the device." />
        <Stepper steps={['Person', 'Device', 'Capture', 'Result']} current={step} />
        {step === 0 && (
          <section className="panel">
            <SelectField label="Person" value={personId} onChange={(e) => setPersonId(e.target.value)}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.personCode}
                </option>
              ))}
            </SelectField>
            <button className="button button-primary" type="button" onClick={() => setStep(1)}>
              Continue
            </button>
          </section>
        )}
        {step === 1 && (
          <section className="panel">
            <SelectField label="Device" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.health})
                </option>
              ))}
            </SelectField>
            <button className="button button-primary" type="button" onClick={start}>
              Start capture
            </button>
          </section>
        )}
        {step >= 2 && (
          <section className="panel">
            <EnrollmentProgress phase={phase} />
            <p className="muted">Status: {enrollment?.status ?? 'PENDING'}</p>
            {phase === 'fail' && (
              <button className="button button-secondary" type="button" onClick={start}>
                Retry
              </button>
            )}
            {phase === 'success' && (
              <Link className="button button-primary" to="/people">
                Done
              </Link>
            )}
          </section>
        )}
      </div>
    </PermissionGate>
  )
}

export function ImportPage() {
  const [rows, setRows] = useState<Person[]>([])
  const [error, setError] = useState('')

  function parse(text: string) {
    const lines = text.trim().split(/\r?\n/)
    const header = lines[0]?.toLowerCase() ?? ''
    if (!header.includes('name') || !header.includes('code')) {
      setError('Map at least name and code columns.')
      return
    }
    const parsed: Person[] = lines.slice(1).map((line, i) => {
      const [personCode, name, type] = line.split(',')
      return {
        id: `import-${i}`,
        personCode: personCode?.trim() ?? '',
        name: name?.trim() ?? '',
        type: type?.trim() === 'EMPLOYEE' ? 'EMPLOYEE' : 'STUDENT',
        email: '',
        phone: '',
        status: 'ACTIVE',
        groupId: api.groups()[0].id,
        consentGiven: false,
      }
    })
    setRows(parsed.filter((r) => r.personCode && r.name))
    setError('')
  }

  return (
    <PermissionGate permission="people.manage">
      <div className="view-stack">
        <PageHeader title="Bulk import" subtitle="Upload, map columns, preview errors, then confirm." />
        <section className="panel">
          <label className="form-field">
            <span>CSV (personCode,name,type)</span>
            <textarea
              rows={6}
              placeholder="personCode,name,type&#10;STU-1099,Isha Kapoor,STUDENT"
              onChange={(e) => parse(e.target.value)}
            />
          </label>
          {error && <p className="field-error">{error}</p>}
          {rows.length === 0 ? (
            <EmptyState title="No preview yet" hint="Paste a CSV with a header row." />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.personCode}</td>
                    <td>{r.name}</td>
                    <td>{r.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button
            className="button button-primary"
            type="button"
            disabled={!rows.length}
            onClick={() => {
              rows.forEach((r) => {
                const { id: _id, ...rest } = r
                void _id
                api.addPerson(rest)
              })
              setRows([])
            }}
          >
            Confirm import
          </button>
        </section>
      </div>
    </PermissionGate>
  )
}
