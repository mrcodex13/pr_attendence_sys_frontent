import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { PermissionGate } from '../../components/ui/Feedback'
import { PageHeader } from '../../components/ui/Workflow'
import { FormActions, SelectField, TextField } from '../../components/ui/Forms'
import { StatusBadge } from '../../components/ui/Status'

export function ReportsPage() {
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof api.directoryGroups>>>([])
  const [records, setRecords] = useState<Awaited<ReturnType<typeof api.attendanceReport>>>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [groupId, setGroupId] = useState('')
  const [previewedFilters, setPreviewedFilters] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const currentFilters = JSON.stringify([from, to, groupId])
  useEffect(() => {
    api.directoryGroups()
      .then(setGroups)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load groups.'))
  }, [])

  async function loadReport(filters: { from?: string; to?: string; groupId?: string }) {
    setLoading(true)
    setError('')
    try {
      setRecords(await api.attendanceReport(filters))
      setPreviewedFilters(JSON.stringify([filters.from ?? '', filters.to ?? '', filters.groupId ?? '']))
    } catch (err) {
      setPreviewedFilters('')
      setError(err instanceof Error ? err.message : 'Could not load report.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.attendanceReport()
      .then(setRecords)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load report.'))
      .finally(() => setLoading(false))
  }, [])

  async function exportFile(kind: 'csv' | 'xlsx') {
    setError('')
    try {
      const blob = await api.downloadAttendanceReport({ from, to, groupId }, kind)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance.${kind}`
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export report.')
    }
  }

  return (
    <PermissionGate permission="reports.export">
      <div className="view-stack">
        <PageHeader
          title="Report builder"
          subtitle="Attendance by date range and group, with server-generated CSV and XLSX exports."
          actions={
            <Link className="button button-secondary" to="/reports/scheduled">
              Scheduled reports
            </Link>
          }
        />
        {error && <p className="field-error" role="alert">{error}</p>}
        <form className="panel form-grid" onSubmit={(event) => { event.preventDefault(); void loadReport({ from, to, groupId }) }}>
          <TextField label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <TextField label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <SelectField label="Group" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </SelectField>
          <FormActions>
            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? 'Loading…' : 'Preview report'}
            </button>
          </FormActions>
        </form>
        <section className="panel table-panel">
          <div className="table-toolbar">
            <h3>Preview results ({records.length} records)</h3>
            <div className="toolbar-actions">
              <button
                className="button button-secondary button-sm"
                type="button"
                disabled={loading || previewedFilters !== currentFilters}
                onClick={() => void exportFile('csv')}
              >
                Export CSV
              </button>
              <button
                className="button button-secondary button-sm"
                type="button"
                disabled={loading || previewedFilters !== currentFilters}
                onClick={() => void exportFile('xlsx')}
              >
                Export XLSX
              </button>
            </div>
          </div>
          {previewedFilters !== currentFilters && (
            <p className="muted export-hint" role="status">Preview the current filters before exporting.</p>
          )}
          {loading && <p className="muted" style={{ padding: '20px' }}>Loading report…</p>}
          {!loading && records.length === 0 && <p className="muted" style={{ padding: '20px' }}>No records match the selected filters.</p>}
          {!loading && records.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.personId}</strong></td>
                      <td>{r.date}</td>
                      <td>
                        <StatusBadge value={r.status} />
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

export function ScheduledReportsPage() {
  const [schedules, setSchedules] = useState<Awaited<ReturnType<typeof api.reportSchedules>>>([])
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [format, setFormat] = useState<'CSV' | 'XLSX'>('CSV')
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY')
  const [weekday, setWeekday] = useState(1)
  const [monthDay, setMonthDay] = useState(1)
  const [localTime, setLocalTime] = useState('18:00')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [recipients, setRecipients] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    api.reportSchedules()
      .then(setSchedules)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load scheduled reports.'))
  }, [])
  async function createSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createReportSchedule({
        name,
        format,
        frequency,
        ...(frequency === 'WEEKLY' ? { weekday } : {}),
        ...(frequency === 'MONTHLY' ? { monthDay } : {}),
        localTime,
        timezone,
        recipients: recipients.split(',').map((email) => email.trim()).filter(Boolean),
      })
      setSchedules(await api.reportSchedules())
      setName('')
      setRecipients('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create scheduled report.')
    } finally {
      setSaving(false)
    }
  }
  async function setScheduleStatus(id: string, status: 'ACTIVE' | 'PAUSED') {
    setError('')
    try {
      await api.updateReportSchedule(id, status)
      setSchedules(await api.reportSchedules())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update scheduled report.')
    }
  }
  async function archiveSchedule(id: string) {
    setError('')
    try {
      await api.deleteReportSchedule(id)
      setSchedules((current) => current.filter((schedule) => schedule.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive scheduled report.')
    }
  }
  return (
    <PermissionGate permission="reports.schedule">
      <div className="view-stack">
        <PageHeader
          title="Scheduled reports"
          subtitle="Attendance reports are delivered to active members by the configured SMTP worker."
          actions={
            <Link className="button button-secondary" to="/reports">
              Back to report builder
            </Link>
          }
        />
        {error && <p className="field-error" role="alert">{error}</p>}
        <form className="panel form-grid" onSubmit={(event) => void createSchedule(event)}>
          <h3 className="full-width" style={{ margin: '0 0 4px', fontSize: '15px' }}>Create new recurring report</h3>
          <TextField label="Schedule name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
          <SelectField label="Format" value={format} onChange={(event) => setFormat(event.target.value as 'CSV' | 'XLSX')}>
            <option value="CSV">CSV</option>
            <option value="XLSX">XLSX</option>
          </SelectField>
          <SelectField label="Frequency" value={frequency} onChange={(event) => setFrequency(event.target.value as typeof frequency)}>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </SelectField>
          {frequency === 'WEEKLY' && (
            <SelectField label="Weekday" value={weekday} onChange={(event) => setWeekday(Number(event.target.value))}>
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => <option key={day} value={index}>{day}</option>)}
            </SelectField>
          )}
          {frequency === 'MONTHLY' && <TextField label="Day of month (1–28)" type="number" value={monthDay} onChange={(event) => setMonthDay(Number(event.target.value))} min={1} max={28} />}
          <TextField label="Local time" type="time" value={localTime} onChange={(event) => setLocalTime(event.target.value)} required />
          <TextField label="IANA timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} required />
          <TextField className="full-width" label="Member email recipients (comma separated)" value={recipients} onChange={(event) => setRecipients(event.target.value)} required />
          <FormActions>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create schedule'}
            </button>
          </FormActions>
        </form>
        {schedules.map((schedule) => (
          <section className="panel" key={schedule.id}>
            <div className="panel-heading">
              <div>
                <h3>{schedule.name}</h3>
                <p className="muted">
                  {schedule.frequency} · {schedule.localTime} {schedule.timezone} · {schedule.format} · {schedule.recipients.join(', ')}
                </p>
                <p className="muted">Next: {new Date(schedule.nextRunAt).toLocaleString()} · Last: {schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString() : 'Not sent yet'}</p>
              </div>
              <span className={`status-pill ${schedule.status === 'ACTIVE' ? 'present' : 'queued'}`}>{schedule.status}</span>
            </div>
            <div className="toolbar-actions" style={{ marginTop: '12px' }}>
              {schedule.status !== 'ARCHIVED' && (
                <button className="button button-secondary button-sm" type="button" onClick={() => void setScheduleStatus(schedule.id, schedule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}>
                  {schedule.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                </button>
              )}
              <button className="button button-danger button-sm" type="button" onClick={() => void archiveSchedule(schedule.id)}>Archive</button>
            </div>
          </section>
        ))}
      </div>
    </PermissionGate>
  )
}
