import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { PersonSummary } from '../../components/ui/People'
import { StatusBadge } from '../../components/ui/Status'
import { EmptyState, PermissionGate } from '../../components/ui/Feedback'
import { CorrectionDialog, ExceptionResolutionDialog, PageHeader } from '../../components/ui/Workflow'
import type { AttendanceRecord, RecordStatus } from '../../types/domain'

export function AttendanceTodayPage() {
  const { user, can } = useAuth()
  const [params] = useSearchParams()
  const statusFilter = params.get('status') as RecordStatus | null
  const people = api.people()
  const groups = api.groups()
  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null)
  const [, bump] = useState(0)

  const rows = useMemo(() => {
    return api.records().filter((r) => {
      const person = people.find((p) => p.id === r.personId)
      if (!person) return false
      if ((user?.role === 'TEACHER' || user?.role === 'MANAGER') && !user.groupIds.includes(person.groupId)) return false
      if (statusFilter && r.status !== statusFilter) return false
      return true
    })
  }, [people, statusFilter, user])

  return (
    <PermissionGate permission="attendance.view">
      <div className="view-stack polished-page">
        <PageHeader
          title="Today"
          subtitle="Derived from scan events. Filter and correct with a reason."
          actions={
            <>
              <Link className="button button-secondary" to="/attendance/session">
                Session view
              </Link>
              <Link className="button button-secondary" to="/exceptions">
                Exceptions
              </Link>
            </>
          }
        />
        <section className="panel table-panel">
          {rows.length === 0 ? (
            <EmptyState title="No records for this filter" hint="Clear the status filter or wait for scans." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Group</th>
                    <th>Status</th>
                    <th>First in</th>
                    <th>Source</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const person = people.find((p) => p.id === r.personId)
                    return (
                      <tr key={r.id}>
                        <td>
                          <PersonSummary name={person?.name ?? '—'} sub={person?.personCode} />
                        </td>
                        <td>{groups.find((g) => g.id === person?.groupId)?.name}</td>
                        <td>
                          <StatusBadge value={r.status} />
                        </td>
                        <td>{r.firstIn ? new Date(r.firstIn).toLocaleTimeString() : '—'}</td>
                        <td>{r.source}</td>
                        <td>
                          {can('attendance.correct') && (
                            <button className="button button-secondary" type="button" onClick={() => setCorrecting(r)}>
                              Correct
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {correcting && user && (
        <CorrectionDialog
          current={correcting.status}
          onCancel={() => setCorrecting(null)}
          onConfirm={(status, reason) => {
            api.correctRecord(correcting.id, status, reason, user.id)
            setCorrecting(null)
            bump((n) => n + 1)
          }}
        />
      )}
    </PermissionGate>
  )
}

export function SessionViewPage() {
  const slots = api.timetable()
  const courses = api.courses()
  const records = api.records()
  const people = api.people()
  return (
    <PermissionGate permission="attendance.view">
      <div className="view-stack polished-page">
        <PageHeader title="Session view" subtitle="Attendance for one class period." />
        {slots.map((s) => {
          const course = courses.find((c) => c.id === s.courseId)
          return (
            <section className="panel" key={s.id}>
              <h3>
                {course?.code} {course?.name} · {s.start}–{s.end} · {s.room}
              </h3>
              {records.slice(0, 4).map((r) => {
                const person = people.find((p) => p.id === r.personId)
                return (
                  <div className="feed-row" key={r.id}>
                    <PersonSummary name={person?.name ?? ''} sub={person?.personCode} />
                    <StatusBadge value={r.status} />
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
    </PermissionGate>
  )
}

export function ExceptionsPage() {
  const [, bump] = useState(0)
  const rows = api.exceptions()
  const devices = api.devices()
  const { can, user } = useAuth()
  const [resolving, setResolving] = useState<string | null>(null)

  return (
    <PermissionGate permission="exceptions.resolve">
      <div className="view-stack polished-page">
        <PageHeader title="Exceptions queue" subtitle="Unknown, inactive, low confidence and rejected scans. Fail visibly." />
        {rows.length === 0 ? (
          <EmptyState title="Queue is clear" hint="New exceptions appear here as soon as a device reports them." />
        ) : (
          <section className="panel table-panel">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Label</th>
                  <th>Device</th>
                  <th>Result</th>
                  <th>Confidence</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.eventId}>
                    <td>{new Date(s.scannedAt).toLocaleTimeString()}</td>
                    <td>
                      {s.displayName}
                      <div className="mono">{s.rawLabel}</div>
                    </td>
                    <td>{devices.find((d) => d.id === s.deviceId)?.name}</td>
                    <td>
                      <StatusBadge value={s.result} />
                    </td>
                    <td>{(s.confidence * 100).toFixed(0)}%</td>
                    <td>
                      {can('exceptions.resolve') && s.result !== 'REJECTED' && (
                        <button className="button button-secondary" type="button" onClick={() => setResolving(s.eventId)}>
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
      {resolving && user && (
        <ExceptionResolutionDialog
          onCancel={() => setResolving(null)}
          onConfirm={(reason) => {
            api.resolveException(resolving, reason, user.name)
            setResolving(null)
            bump((n) => n + 1)
          }}
        />
      )}
    </PermissionGate>
  )
}

export function LeavePage() {
  const [, bump] = useState(0)
  const leave = api.leave()
  const people = api.people()
  return (
    <PermissionGate permission="leave.review">
      <div className="view-stack">
        <PageHeader title="Leave & excuses" subtitle="Approved leave blocks automatic ABSENT at cut-off." />
        <section className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Dates</th>
                <th>Type</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {leave.map((l) => (
                <tr key={l.id}>
                  <td>{people.find((p) => p.id === l.personId)?.name}</td>
                  <td>
                    {l.from} → {l.to}
                  </td>
                  <td>{l.type}</td>
                  <td>
                    <StatusBadge value={l.status === 'APPROVED' ? 'EXCUSED' : l.status === 'REJECTED' ? 'ABSENT' : 'QUEUED'} />
                  </td>
                  <td>
                    {l.status === 'PENDING' && (
                      <>
                        <button className="button button-primary" type="button" onClick={() => { api.setLeaveStatus(l.id, 'APPROVED'); bump((n) => n + 1) }}>
                          Approve
                        </button>
                        <button className="button button-secondary" type="button" onClick={() => { api.setLeaveStatus(l.id, 'REJECTED'); bump((n) => n + 1) }}>
                          Reject
                        </button>
                      </>
                    )}
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
