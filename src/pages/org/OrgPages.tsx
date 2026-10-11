import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { PermissionGate } from '../../components/ui/Feedback'
import { PageHeader } from '../../components/ui/Workflow'
import { PersonSummary } from '../../components/ui/People'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function GroupsPage() {
  const groups = api.groups()
  const people = api.people()
  const users = api.users()
  return (
    <PermissionGate permission="groups.manage">
      <div className="view-stack">
        <PageHeader title="Groups" subtitle="Classes and sections, or departments and teams. Optional supervisor." />
        {groups.map((g) => (
          <section className="panel" key={g.id}>
            <div className="panel-heading">
              <div>
                <h3>{g.name}</h3>
                <span>
                  {g.kind} · Supervisor {users.find((u) => u.id === g.supervisorUserId)?.name ?? '—'}
                </span>
              </div>
            </div>
            {people
              .filter((p) => p.groupId === g.id)
              .map((p) => (
                <div className="feed-row" key={p.id}>
                  <PersonSummary name={p.name} sub={p.personCode} />
                </div>
              ))}
          </section>
        ))}
      </div>
    </PermissionGate>
  )
}

export function TimetablePage() {
  const courses = api.courses()
  const slots = api.timetable()
  const groups = api.groups()
  return (
    <PermissionGate permission="courses.manage">
      <div className="view-stack">
        <PageHeader
          title="Courses & timetable"
          subtitle="Weekly grid. Device room + time resolve the session."
          actions={
            <Link className="button button-secondary" to="/organization/groups">
              Groups
            </Link>
          }
        />
        <div className="table-wrap panel">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Group</th>
                <th>Day</th>
                <th>Start</th>
                <th>End</th>
                <th>Room</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s) => {
                const course = courses.find((c) => c.id === s.courseId)
                return (
                  <tr key={s.id}>
                    <td>
                      {course?.code} {course?.name}
                    </td>
                    <td>{groups.find((g) => g.id === course?.groupId)?.name}</td>
                    <td>{DAYS[s.weekday]}</td>
                    <td>{s.start}</td>
                    <td>{s.end}</td>
                    <td>{s.room}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGate>
  )
}

export function ShiftsPage() {
  const shifts = api.shifts()
  return (
    <PermissionGate permission="schedules.manage">
      <div className="view-stack">
        <PageHeader title="Shifts" subtitle="Company mode: first scan is check-in. Grace minutes are settings, not code." />
        {shifts.map((s) => (
          <section className="panel" key={s.id}>
            <h3>{s.name}</h3>
            <p>
              {s.start} – {s.end} · grace {s.graceMinutes} min
            </p>
            <p className="muted">Working days: {s.workingDays.map((d) => DAYS[d]).join(', ')}</p>
          </section>
        ))}
      </div>
    </PermissionGate>
  )
}

export function HolidaysPage() {
  const holidays = api.holidays()
  return (
    <PermissionGate permission="holidays.manage">
      <div className="view-stack">
        <PageHeader title="Holidays" subtitle="Per site. Scheduled people with no scan on a holiday are not marked absent." />
        <section className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Site</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.id}>
                  <td>{h.date}</td>
                  <td>{h.name}</td>
                  <td>{h.siteId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </PermissionGate>
  )
}
