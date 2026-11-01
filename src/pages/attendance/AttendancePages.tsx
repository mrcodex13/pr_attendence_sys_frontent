import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { PersonSummary } from '../../components/ui/People'
import { StatusBadge } from '../../components/ui/Status'
import { EmptyState, PermissionGate } from '../../components/ui/Feedback'
import { CorrectionDialog, ExceptionResolutionDialog, ManualAttendanceDialog, PageHeader } from '../../components/ui/Workflow'
import type { AttendanceRecord, RecordStatus } from '../../types/domain'

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function AttendanceTodayPage() {
  const { can } = useAuth()
  const [params] = useSearchParams()
  const statusFilter = params.get('status') as RecordStatus | null
  const [people, setPeople] = useState<Awaited<ReturnType<typeof api.directoryPeople>>>([])
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof api.directoryGroups>>>([])
  const [rows, setRows] = useState<AttendanceRecord[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null)
  const [manualEntryOpen, setManualEntryOpen] = useState(false)
  const [savingManual, setSavingManual] = useState(false)
  useEffect(() => {
    let active = true
    const date = localDateKey()
    Promise.all([
      api.directoryPeople(),
      api.directoryGroups(),
      api.attendanceRecords({ date, ...(statusFilter ? { status: statusFilter } : {}) }),
    ])
      .then(([nextPeople, nextGroups, nextRows]) => {
        if (!active) return
        setPeople(nextPeople)
        setGroups(nextGroups)
        setRows(nextRows)
        setError('')
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load attendance.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [statusFilter])

  return (
    <PermissionGate permission="attendance.view">
      <div className="view-stack">
        <PageHeader
          title="Today"
          subtitle="Derived from scan events. Filter and correct with a reason."
          actions={
            <>
              {can('attendance.correct') && (
                <button className="button button-primary" type="button" onClick={() => setManualEntryOpen(true)}>
                  Record attendance
                </button>
              )}
              <Link className="button button-primary" to="/camera">
                Camera Attendance
              </Link>
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
          <div className="table-toolbar">
            <h3>Attendance logs ({localDateKey()})</h3>
          </div>
          {error && <p className="field-error" role="alert" style={{ padding: '14px 20px' }}>{error}</p>}
          {loading && <p className="muted" role="status" style={{ padding: '20px' }}>Loading attendance…</p>}
          {!loading && !error && rows.length === 0 ? (
            <EmptyState title="No records for this filter" hint="Clear the status filter or wait for scans." />
          ) : rows.length > 0 ? (
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
                          <div className="table-actions">
                            {can('attendance.correct') && (
                              <button className="button button-secondary button-sm" type="button" onClick={() => setCorrecting(r)}>
                                Correct
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
      {correcting && (
        <CorrectionDialog
          current={correcting.status}
          onCancel={() => setCorrecting(null)}
          onConfirm={(status, reason) => {
            void api.correctDirectoryAttendance(correcting.id, status, reason)
              .then((updated) => {
                setRows((current) => current.map((row) => row.id === updated.id ? updated : row))
                setCorrecting(null)
              })
              .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not correct attendance.'))
          }}
        />
      )}
      {manualEntryOpen && (
        <ManualAttendanceDialog
          people={people.filter((person) => person.status === 'ACTIVE')}
          busy={savingManual}
          onCancel={() => setManualEntryOpen(false)}
          onConfirm={(personId, status, reason) => {
            setSavingManual(true)
            void api.createManualAttendance({ personId, date: localDateKey(), status, reason })
              .then((created) => {
                setRows((current) => current.some((item) => item.id === created.id)
                  ? current.map((item) => item.id === created.id ? created : item)
                  : [created, ...current])
                setManualEntryOpen(false)
              })
              .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not record attendance.'))
              .finally(() => setSavingManual(false))
          }}
        />
      )}
    </PermissionGate>
  )
}

export function SessionViewPage() {
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof api.timetable>>>([])
  const [courses, setCourses] = useState<Awaited<ReturnType<typeof api.courses>>>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [people, setPeople] = useState<Awaited<ReturnType<typeof api.directoryPeople>>>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const date = localDateKey()
    Promise.all([api.timetable(), api.courses(), api.attendanceRecords({ date }), api.directoryPeople()])
      .then(([nextSlots, nextCourses, nextRecords, nextPeople]) => {
        if (!active) return
        setSlots(nextSlots)
        setCourses(nextCourses)
        setRecords(nextRecords)
        setPeople(nextPeople)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load session attendance.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])
  return (
    <PermissionGate permission="attendance.view">
      <div className="view-stack">
        <PageHeader title="Session view" subtitle="Attendance for one class period." />
        {loading && <p className="muted" role="status">Loading sessions…</p>}
        {error && <p className="field-error" role="alert">{error}</p>}
        {!loading && !error && slots.length === 0 && (
          <EmptyState title="No sessions scheduled" hint="Add courses and timetable slots to see session attendance." />
        )}
        {!loading && !error && slots.map((s) => {
          const course = courses.find((c) => c.id === s.courseId)
          const sessionRecords = records.filter((record) => record.scheduleId === s.id)
          return (
            <section className="panel" key={s.id}>
              <div className="panel-heading">
                <div>
                  <h3>
                    {course?.code} {course?.name} · {s.start}–{s.end} · Room {s.room}
                  </h3>
                  <span>{sessionRecords.length} attendees recorded</span>
                </div>
              </div>
              {sessionRecords.length === 0 && <p className="muted">No attendance records for this session.</p>}
              {sessionRecords.slice(0, 4).map((r) => {
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
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.directoryExceptions>>>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const { can, user } = useAuth()
  const [resolving, setResolving] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    api.directoryExceptions()
      .then((result) => {
        if (active) setRows(result)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load exceptions.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <PermissionGate permission="exceptions.resolve">
      <div className="view-stack">
        <PageHeader title="Exceptions queue" subtitle="Unknown, inactive, low confidence and rejected scans. Fail visibly." />
        {error && <p className="field-error" role="alert">{error}</p>}
        {loading && <p className="muted" role="status">Loading exceptions…</p>}
        {!loading && !error && rows.length === 0 ? (
          <EmptyState title="Queue is clear" hint="New exceptions appear here as soon as a device reports them." />
        ) : rows.length > 0 ? (
          <section className="panel table-panel">
            <div className="table-toolbar">
              <h3>Unresolved exceptions</h3>
            </div>
            <div className="table-wrap">
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
                        <strong>{s.displayName}</strong>
                        <div className="mono" style={{ color: 'var(--muted)', fontSize: '11px' }}>{s.rawLabel}</div>
                      </td>
                      <td>{s.deviceId}</td>
                      <td>
                        <StatusBadge value={s.result} />
                      </td>
                      <td>{(s.confidence * 100).toFixed(0)}%</td>
                      <td>
                        <div className="table-actions">
                          {can('exceptions.resolve') && s.result !== 'REJECTED' && (
                            <button className="button button-primary button-sm" type="button" onClick={() => setResolving(s.eventId)}>
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
      {resolving && user && (
        <ExceptionResolutionDialog
          onCancel={() => setResolving(null)}
          onConfirm={(reason) => {
            void api.resolveDirectoryException(resolving, reason)
              .then(() => {
                setRows((current) => current.filter((row) => row.eventId !== resolving))
                setResolving(null)
              })
              .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not resolve exception.'))
          }}
        />
      )}
    </PermissionGate>
  )
}

export function LeavePage() {
  const [leave, setLeave] = useState<Awaited<ReturnType<typeof api.directoryLeave>>>([])
  const [people, setPeople] = useState<Awaited<ReturnType<typeof api.directoryPeople>>>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    Promise.all([api.directoryLeave(), api.directoryPeople()])
      .then(([nextLeave, nextPeople]) => {
        if (!active) return
        setLeave(nextLeave)
        setPeople(nextPeople)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load leave requests.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])
  async function reviewLeave(id: string, status: 'APPROVED' | 'REJECTED') {
    setError('')
    try {
      await api.reviewDirectoryLeave(id, status)
      setLeave((current) => current.map((item) => item.id === id ? { ...item, status } : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update leave request.')
    }
  }
  return (
    <PermissionGate permission="leave.review">
      <div className="view-stack">
        <PageHeader title="Leave & excuses" subtitle="Approved leave blocks automatic ABSENT at cut-off." />
        {error && <p className="field-error" role="alert">{error}</p>}
        <section className="panel table-panel">
          <div className="table-toolbar">
            <h3>Leave & absence requests</h3>
          </div>
          {loading && <p className="muted" role="status" style={{ padding: '20px' }}>Loading leave requests…</p>}
          {!loading && !error && leave.length === 0 && <p className="muted" style={{ padding: '20px' }}>No leave requests found.</p>}
          {!loading && !error && leave.length > 0 && (
          <div className="table-wrap">
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
                    <td><strong>{people.find((p) => p.id === l.personId)?.name ?? '—'}</strong></td>
                    <td>
                      {l.from} → {l.to}
                    </td>
                    <td>{l.type}</td>
                    <td>
                      <StatusBadge value={l.status === 'APPROVED' ? 'EXCUSED' : l.status === 'REJECTED' ? 'ABSENT' : 'QUEUED'} />
                    </td>
                    <td>
                      <div className="table-actions">
                        {l.status === 'PENDING' && (
                          <>
                            <button className="button button-primary button-sm" type="button" onClick={() => void reviewLeave(l.id, 'APPROVED')}>
                              Approve
                            </button>
                            <button className="button button-danger button-sm" type="button" onClick={() => void reviewLeave(l.id, 'REJECTED')}>
                              Reject
                            </button>
                          </>
                        )}
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
    </PermissionGate>
  )
}
