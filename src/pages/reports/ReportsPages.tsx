import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { PermissionGate } from '../../components/ui/Feedback'
import { PageHeader } from '../../components/ui/Workflow'
import { SelectField, TextField } from '../../components/ui/Forms'
import { StatusBadge } from '../../components/ui/Status'

export function ReportsPage() {
  const groups = api.groups()
  const records = api.records()
  const people = api.people()
  const [type, setType] = useState('daily')

  function exportFile(kind: 'csv' | 'xlsx' | 'pdf') {
    const lines = ['Person,Date,Status', ...records.map((r) => `${people.find((p) => p.id === r.personId)?.name},${r.date},${r.status}`)]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${type}.${kind === 'pdf' ? 'csv' : kind}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PermissionGate permission="reports.export">
      <div className="view-stack polished-page">
        <PageHeader
          title="Report builder"
          subtitle="Type, range, groups, preview, then export."
          actions={
            <Link className="button button-secondary" to="/reports/scheduled">
              Scheduled reports
            </Link>
          }
        />
        <section className="panel form-grid">
          <SelectField label="Report type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="daily">Daily attendance</option>
            <option value="person">Person history</option>
            <option value="exceptions">Exceptions</option>
            <option value="devices">Device health</option>
          </SelectField>
          <TextField label="From" type="date" />
          <TextField label="To" type="date" />
          <SelectField label="Group">
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </SelectField>
        </section>
        <section className="panel table-panel">
          <div className="table-toolbar">
            <h3>Preview</h3>
            <div className="toolbar-actions">
              <button className="button button-secondary" type="button" onClick={() => exportFile('csv')}>
                CSV
              </button>
              <button className="button button-secondary" type="button" onClick={() => exportFile('xlsx')}>
                XLSX
              </button>
              <button className="button button-secondary" type="button" onClick={() => exportFile('pdf')}>
                PDF
              </button>
            </div>
          </div>
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
                  <td>{people.find((p) => p.id === r.personId)?.name}</td>
                  <td>{r.date}</td>
                  <td>
                    <StatusBadge value={r.status} />
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

export function ScheduledReportsPage() {
  return (
    <PermissionGate permission="reports.export">
      <div className="view-stack">
        <PageHeader title="Scheduled reports" subtitle="Delivered by email from the worker." />
        <section className="panel">
          <div className="feed-row">
            <span className="feed-copy">
              <strong>Weekly absence digest</strong>
              <small>Fridays 18:00 · office@campus.edu</small>
            </span>
            <span className="status-pill present">Active</span>
          </div>
          <button className="button button-primary" type="button">
            Create schedule
          </button>
        </section>
      </div>
    </PermissionGate>
  )
}
