import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { PageHeader } from '../components/ui/Workflow'
import { StatusBadge } from '../components/ui/Status'
import { formatDateTime } from '../lib/format'
import type { AttendanceRecord } from '../types/domain'

export function MyAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.myAttendance()
      .then((result) => {
        if (active) setRecords(result)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load your attendance.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="view-stack">
      <PageHeader title="My attendance" subtitle="Your personal attendance history and verification logs." />
      {error && <p className="field-error" role="alert">{error}</p>}
      <section className="panel table-panel">
        <div className="table-toolbar">
          <h3>Recent attendance sessions</h3>
        </div>
        {loading && <p className="muted" role="status" style={{ padding: '20px' }}>Loading your attendance…</p>}
        {!loading && records.length === 0 && <p className="muted" style={{ padding: '20px' }}>No attendance records recorded yet.</p>}
        {records.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Status</th><th>First in</th><th>Last out</th><th>Minutes worked</th></tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td><strong>{record.date}</strong></td>
                    <td><StatusBadge value={record.status} /></td>
                    <td>{record.firstIn ? formatDateTime(record.firstIn) : '—'}</td>
                    <td>{record.lastOut ? formatDateTime(record.lastOut) : '—'}</td>
                    <td><span className="mono">{record.minutesWorked ? `${record.minutesWorked} min` : '—'}</span></td>
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
