import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { PermissionGate } from '../../components/ui/Feedback'
import { PageHeader } from '../../components/ui/Workflow'
import { PersonSummary } from '../../components/ui/People'
import { FormActions, SelectField, TextField } from '../../components/ui/Forms'
import type { Course, Group, Holiday, ScheduleSlot, Shift } from '../../types/domain'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function GroupsPage() {
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof api.directoryGroups>>>([])
  const [people, setPeople] = useState<Awaited<ReturnType<typeof api.directoryPeople>>>([])
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<Group['kind']>('CLASS')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    Promise.all([api.directoryGroups(), api.directoryPeople()])
      .then(([nextGroups, nextPeople]) => {
        setGroups(nextGroups)
        setPeople(nextPeople)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load groups.'))
  }, [])

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const group = await api.createDirectoryGroup({ name, kind })
      setGroups((current) => [...current, group].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create group.')
    } finally {
      setSaving(false)
    }
  }

  async function archiveGroup(group: Group) {
    setError('')
    try {
      await api.updateDirectoryGroup(group.id, { status: 'ARCHIVED' })
      setGroups((current) => current.filter((item) => item.id !== group.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive group.')
    }
  }
  return (
    <PermissionGate permission="groups.manage">
      <div className="view-stack">
        <PageHeader title="Groups" subtitle="Classes and sections, or departments and teams. Optional supervisor." />
        {error && <p className="field-error" role="alert">{error}</p>}
        <form className="panel form-grid" onSubmit={(event) => void createGroup(event)}>
          <TextField label="Group name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} />
          <SelectField label="Group type" value={kind} onChange={(event) => setKind(event.target.value as Group['kind'])}>
            <option value="CLASS">Class</option>
            <option value="DEPARTMENT">Department</option>
            <option value="TEAM">Team</option>
          </SelectField>
          <FormActions>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create group'}
            </button>
          </FormActions>
        </form>
        {groups.map((g) => (
          <section className="panel" key={g.id}>
            <div className="panel-heading">
              <div>
                <h3>{g.name}</h3>
                <span>
                  {g.kind} · Supervisor {g.supervisorUserId ?? '—'}
                </span>
              </div>
              <button className="button button-danger button-sm" type="button" onClick={() => void archiveGroup(g)}>
                Archive
              </button>
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
  const [courses, setCourses] = useState<Course[]>([])
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [error, setError] = useState('')
  const [courseName, setCourseName] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [groupId, setGroupId] = useState('')
  const [teacherUserId, setTeacherUserId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [weekday, setWeekday] = useState(1)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [room, setRoom] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    Promise.all([api.courses(), api.timetable(), api.directoryGroups()])
      .then(([nextCourses, nextSlots, nextGroups]) => {
        setCourses(nextCourses)
        setSlots(nextSlots)
        setGroups(nextGroups)
        setCourseId((current) => current || nextCourses[0]?.id || '')
        setGroupId((current) => current || nextGroups[0]?.id || '')
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load schedules.'))
  }, [])
  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const created = await api.createCourse({ name: courseName, code: courseCode, groupId, teacherUserId })
      setCourses((current) => [...current, created])
      setCourseId(created.id)
      setCourseName('')
      setCourseCode('')
      setTeacherUserId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create course.')
    } finally {
      setSaving(false)
    }
  }
  async function createSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const created = await api.createScheduleSlot({ courseId, weekday, start, end, room })
      setSlots((current) => [...current, created].sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create timetable slot.')
    } finally {
      setSaving(false)
    }
  }
  async function archiveSlot(id: string) {
    setError('')
    try {
      await api.archiveScheduleSlot(id)
      setSlots((current) => current.filter((slot) => slot.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive timetable slot.')
    }
  }
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
        {error && <p className="field-error" role="alert">{error}</p>}
        <form className="panel form-grid" onSubmit={(event) => void createCourse(event)}>
          <h3 className="full-width" style={{ margin: '0 0 4px', fontSize: '15px' }}>Add a new course</h3>
          <TextField label="Course name" value={courseName} onChange={(event) => setCourseName(event.target.value)} required minLength={2} maxLength={120} />
          <TextField label="Course code" value={courseCode} onChange={(event) => setCourseCode(event.target.value)} required minLength={2} maxLength={40} />
          <SelectField label="Group" value={groupId} onChange={(event) => setGroupId(event.target.value)} required>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </SelectField>
          <TextField label="Teacher user ID" value={teacherUserId} onChange={(event) => setTeacherUserId(event.target.value)} required />
          <FormActions>
            <button className="button button-primary" type="submit" disabled={saving || !groups.length}>
              {saving ? 'Saving…' : 'Create course'}
            </button>
          </FormActions>
        </form>
        <form className="panel form-grid" onSubmit={(event) => void createSlot(event)}>
          <h3 className="full-width" style={{ margin: '0 0 4px', fontSize: '15px' }}>Add timetable slot</h3>
          <SelectField label="Course" value={courseId} onChange={(event) => setCourseId(event.target.value)} required>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.code} · {course.name}</option>)}
          </SelectField>
          <SelectField label="Weekday" value={weekday} onChange={(event) => setWeekday(Number(event.target.value))}>
            {DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
          </SelectField>
          <TextField label="Start" type="time" value={start} onChange={(event) => setStart(event.target.value)} required />
          <TextField label="End" type="time" value={end} onChange={(event) => setEnd(event.target.value)} required />
          <TextField label="Room" value={room} onChange={(event) => setRoom(event.target.value)} maxLength={120} />
          <FormActions>
            <button className="button button-primary" type="submit" disabled={saving || !courses.length}>
              {saving ? 'Saving…' : 'Add timetable slot'}
            </button>
          </FormActions>
        </form>
        <div className="panel table-panel">
          <div className="table-toolbar">
            <h3>Timetable schedule</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Group</th>
                  <th>Day</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Room</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => {
                  const course = courses.find((c) => c.id === s.courseId)
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{course?.code} {course?.name}</strong>
                      </td>
                      <td>{groups.find((g) => g.id === course?.groupId)?.name}</td>
                      <td>{DAYS[s.weekday]}</td>
                      <td>{s.start}</td>
                      <td>{s.end}</td>
                      <td>{s.room}</td>
                      <td>
                        <div className="table-actions">
                          <button className="button button-danger button-sm" type="button" onClick={() => void archiveSlot(s.id)}>Archive</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PermissionGate>
  )
}

export function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:00')
  const [graceMinutes, setGraceMinutes] = useState(10)
  const [workingDays, setWorkingDays] = useState('1,2,3,4,5')
  useEffect(() => {
    api.shifts().then(setShifts).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load shifts.'))
  }, [])
  async function createShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      const created = await api.createShift({
        name, start, end, graceMinutes,
        workingDays: workingDays.split(',').map((day) => Number(day.trim())),
      })
      setShifts((current) => [...current, created])
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create shift.')
    }
  }
  return (
    <PermissionGate permission="schedules.manage">
      <div className="view-stack">
        <PageHeader title="Shifts" subtitle="Company mode: first scan is check-in. Grace minutes are settings, not code." />
        {error && <p className="field-error" role="alert">{error}</p>}
        <form className="panel form-grid" onSubmit={(event) => void createShift(event)}>
          <TextField label="Shift name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
          <TextField label="Start" type="time" value={start} onChange={(event) => setStart(event.target.value)} required />
          <TextField label="End" type="time" value={end} onChange={(event) => setEnd(event.target.value)} required />
          <TextField label="Grace minutes" type="number" value={graceMinutes} onChange={(event) => setGraceMinutes(Number(event.target.value))} min={0} max={720} />
          <TextField label="Working weekdays (0–6, comma separated)" value={workingDays} onChange={(event) => setWorkingDays(event.target.value)} required />
          <FormActions>
            <button className="button button-primary" type="submit">Create shift</button>
          </FormActions>
        </form>
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
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([])
  const [error, setError] = useState('')
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [siteId, setSiteId] = useState('')
  useEffect(() => {
    Promise.all([api.holidays(), api.directorySites()])
      .then(([nextHolidays, nextSites]) => {
        setHolidays(nextHolidays)
        setSites(nextSites.filter((site) => site.status === 'ACTIVE'))
        setSiteId(nextSites.find((site) => site.status === 'ACTIVE')?.id ?? '')
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load holidays.'))
  }, [])
  async function createHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      const created = await api.createHoliday({ date, name, siteId })
      setHolidays((current) => [...current, created].sort((a, b) => a.date.localeCompare(b.date)))
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create holiday.')
    }
  }
  return (
    <PermissionGate permission="holidays.manage">
      <div className="view-stack">
        <PageHeader title="Holidays" subtitle="Per site. Scheduled people with no scan on a holiday are not marked absent." />
        {error && <p className="field-error" role="alert">{error}</p>}
        <form className="panel form-grid" onSubmit={(event) => void createHoliday(event)}>
          <TextField label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          <TextField label="Holiday name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
          <SelectField label="Site" value={siteId} onChange={(event) => setSiteId(event.target.value)} required>
            {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </SelectField>
          <FormActions>
            <button className="button button-primary" type="submit" disabled={!sites.length}>Create holiday</button>
          </FormActions>
        </form>
        <section className="panel table-panel">
          <div className="table-toolbar">
            <h3>Scheduled holidays</h3>
          </div>
          <div className="table-wrap">
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
                    <td><strong>{h.name}</strong></td>
                    <td>{h.siteId}</td>
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
