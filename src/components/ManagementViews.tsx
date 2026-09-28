import { useMemo, useState, type FormEvent } from 'react'
import { departments } from '../data'
import type { AttendanceRecord, AttendanceStatus, Notice, Student } from '../types'
import { Icon } from './Icon'

interface ViewProps {
  students: Student[]
  attendance: AttendanceRecord[]
  onAddStudent: (student: Student) => boolean
  onAttendanceFilter?: (status: AttendanceStatus) => void
  onToast: (message: string) => void
  onLogout?: () => void
  adminName?: string
}

export function StudentsView({ students, onAddStudent, onToast, globalSearch = '' }: ViewProps & { globalSearch?: string }) {
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const filtered = useMemo(() => students.filter((student) => {
    const searchable = `${student.name} ${student.id} ${student.dept}`.toLowerCase()
    return searchable.includes(query.toLowerCase()) && searchable.includes(globalSearch.toLowerCase())
  }), [students, query, globalSearch])

  function submitStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const student: Student = {
      name: String(form.get('name')).trim(),
      id: String(form.get('id')).trim(),
      dept: String(form.get('dept')),
      semester: String(form.get('semester')),
      email: String(form.get('email')).trim(),
      phone: String(form.get('phone')).trim(),
      pct: 100, present: 1, absent: 0, late: 0, total: 1,
    }
    if (!onAddStudent(student)) return
    event.currentTarget.reset()
    setShowForm(false)
    onToast(`${student.name} added to the student list.`)
  }

  return <div className="view-stack">
    <section className="panel table-panel">
      <div className="table-toolbar"><label className="table-search"><Icon name="search" size={16} /><input placeholder="Search by name, roll number or ID" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="toolbar-actions"><button className="button button-secondary" type="button" onClick={() => onToast('Import file handling will be connected to your backend.') }><Icon name="upload" /> Import Excel</button><button className="button button-primary" type="button" onClick={() => setShowForm((value) => !value)}><Icon name={showForm ? 'close' : 'plus'} /> Add student</button></div></div>
      {showForm && <form className="add-student-form" onSubmit={submitStudent}><FormInput label="Full name" name="name" required /><FormInput label="Roll number / ID" name="id" required /><label className="form-field"><span>Branch</span><select name="dept">{departments.map((dept) => <option key={dept}>{dept}</option>)}</select></label><label className="form-field"><span>Semester</span><select name="semester">{['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', 'Employee'].map((sem) => <option key={sem}>{sem}</option>)}</select></label><FormInput label="Email" name="email" type="email" /><FormInput label="Phone" name="phone" /><button className="button button-primary form-submit" type="submit">Save student</button></form>}
      <div className="table-wrap"><table><thead><tr><th>Student</th><th>Roll no. / ID</th><th>Branch</th><th>Attendance</th><th>Standing</th><th>Actions</th></tr></thead><tbody>{filtered.map((student) => <tr key={student.id}><td><div className="student-cell"><span className="avatar row-avatar">{initials(student.name)}</span><span><strong>{student.name}</strong><small>{student.email}</small></span></div></td><td className="mono">{student.id}</td><td><span className="department-tag">{departmentShort(student.dept)}</span></td><td><div className="attendance-cell"><strong>{student.pct}%</strong><span className="mini-progress"><i style={{ width: `${student.pct}%` }} /></span></div></td><td><span className={`status-pill ${student.pct >= 85 ? 'present' : student.pct >= 75 ? 'late' : 'absent'}`}>{student.pct >= 85 ? 'Good' : student.pct >= 75 ? 'Average' : 'Low'}</span></td><td><div className="action-buttons"><button type="button" title={`View ${student.name}`} onClick={() => onToast(`${student.name} · ${student.semester} · ${student.phone}`)}><Icon name="eye" size={16} /></button><button type="button" title={`Delete ${student.name}`} onClick={() => onToast('Student records can be managed from your connected backend.')}><Icon name="edit" size={16} /></button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <EmptyState title="No students found" message="Try another search term or add a new student." />}</div>
      <div className="table-footer"><span>Showing <strong>{filtered.length}</strong> of {students.length} students</span><span>Updated just now</span></div>
    </section>
  </div>
}

export function AttendanceView({ attendance, initialFilter }: ViewProps & { initialFilter?: AttendanceStatus }) {
  const [filter, setFilter] = useState<'all' | AttendanceStatus>(initialFilter ?? 'all')
  const [query, setQuery] = useState('')
  const filtered = attendance.filter((record) => (filter === 'all' || record.status === filter) && `${record.name} ${record.id} ${record.dept}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="view-stack"><div className="attendance-summary">{(['present', 'late', 'absent'] as const).map((status) => <button type="button" key={status} className={`summary-chip ${filter === status ? 'selected' : ''}`} onClick={() => setFilter(filter === status ? 'all' : status)}><span className={`status-dot ${status}`} /> {attendance.filter((record) => record.status === status).length} {status} today</button>)}</div><section className="panel table-panel"><div className="table-toolbar"><div className="filter-tabs">{(['all', 'present', 'late', 'absent'] as const).map((status) => <button type="button" key={status} className={filter === status ? 'selected' : ''} onClick={() => setFilter(status)}>{status === 'all' ? 'All records' : status}</button>)}</div><label className="table-search"><Icon name="search" size={16} /><input placeholder="Search attendance" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div><div className="table-wrap"><table><thead><tr><th>Time</th><th>Student</th><th>ID</th><th>Branch</th><th>Status</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td className="mono">{record.time}</td><td><div className="student-cell"><span className="avatar row-avatar">{initials(record.name)}</span><strong>{record.name}</strong></div></td><td className="mono">{record.id}</td><td><span className="department-tag">{departmentShort(record.dept)}</span></td><td><span className={`status-pill ${record.status}`}>{record.status}</span></td></tr>)}</tbody></table>{filtered.length === 0 && <EmptyState title="No records match" message="Change the selected status or search query." />}</div><div className="table-footer"><span>Showing {filtered.length} attendance records</span><span>Live camera sync <i className="status-pulse" /></span></div></section></div>
}

export function ReportsView({ students, onToast }: ViewProps) {
  const [department, setDepartment] = useState('all')
  const [period, setPeriod] = useState('This month')
  const filtered = students.filter((student) => department === 'all' || student.dept === department)
  function exportCsv() {
    const columns = ['Name', 'Roll no / ID', 'Branch', 'Semester', 'Total days', 'Present', 'Absent', 'Late', 'Attendance %']
    const lines = [columns, ...filtered.map((student) => [student.name, student.id, student.dept, student.semester, student.total, student.present, student.absent, student.late, `${student.pct}%`])].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([lines], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    onToast(`Exported ${filtered.length} student records.`)
  }
  return <div className="reports-layout"><section className="panel table-panel"><div className="panel-heading report-heading"><div><h3>Attendance report</h3><span>Review attendance by student and branch</span></div><div className="report-filters"><select value={period} onChange={(event) => setPeriod(event.target.value)}><option>This month</option><option>Last month</option><option>This semester</option></select><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="all">All branches</option>{departments.map((dept) => <option value={dept} key={dept}>{departmentShort(dept)}</option>)}</select></div></div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Total days</th><th>Present</th><th>Absent</th><th>Late</th><th>Attendance</th></tr></thead><tbody>{filtered.map((student) => <tr key={student.id}><td><strong>{student.name}</strong></td><td className="mono">{student.total}</td><td className="good-text">{student.present}</td><td className="bad-text">{student.absent}</td><td className="warning-text">{student.late}</td><td><strong>{student.pct}%</strong></td></tr>)}</tbody></table></div><div className="table-footer"><span>{period} · {filtered.length} records</span><span>Attendance summary</span></div></section><section className="panel export-panel"><span className="export-icon"><Icon name="download" size={20} /></span><h3>Download report</h3><p>Export your current attendance summary as a spreadsheet-ready CSV.</p><label className="form-field"><span>Report type</span><select><option>Daily report</option><option>Weekly report</option><option>Monthly report</option></select></label><button className="button button-primary button-wide" onClick={exportCsv} type="button"><Icon name="download" /> Export CSV</button><small>Data is generated from the records currently shown.</small></section></div>
}

export function AnalyticsView({ students }: ViewProps) {
  const average = students.length ? (students.reduce((sum, student) => sum + student.pct, 0) / students.length).toFixed(1) : '0.0'
  return <div className="view-stack"><div className="page-intro"><div><h2>Analytics overview</h2><p>Explore attendance performance across branches.</p></div><select aria-label="Analytics range"><option>This month</option><option>This semester</option><option>This year</option></select></div><div className="analytics-stat-grid"><Metric label="Average attendance" value={`${average}%`} delta="+2.4%" tone="green" /><Metric label="Highest attendance" value={`${Math.max(...students.map((student) => student.pct), 0)}%`} delta="CSE · top branch" tone="blue" /><Metric label="Students at risk" value={String(students.filter((student) => student.pct < 75).length).padStart(2, '0')} delta="Below 75% threshold" tone="red" /><Metric label="Late marks" value="18" delta="This month" tone="amber" /></div><div className="dashboard-grid analytics-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h3>Attendance trend</h3><span>Campus-wide · last 7 days</span></div><span className="chart-change">↗ 4.8%</span></div><div className="large-chart"><AnalyticsLine /></div></section><section className="panel"><PanelTitle title="Branch-wise attendance" subtitle="Average percentage by branch" />{departments.slice(0, 5).map((dept, index) => <div className="department-row analytics-dept" key={dept}><span>{departmentShort(dept)}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${92 - index * 3}%` }} /></div><strong>{92 - index * 3}%</strong></div>)}</section></div></div>
}

export function NotificationsView({ notices, onToast }: { notices: Notice[]; onToast: (message: string) => void }) {
  return <section className="panel notification-panel"><div className="panel-heading"><div><h3>Notifications</h3><span>You’re up to date with your campus activity</span></div><button onClick={() => onToast('All notifications marked as read.')} type="button">Mark all as read <span aria-hidden="true">→</span></button></div>{notices.map((notice) => <div className="notification-row" key={notice.title}><span className={`notice-icon ${notice.tone}`}><Icon name={notice.icon} /></span><div className="notification-copy"><strong>{notice.title}</strong><p>{notice.description}</p></div><time>{notice.time}</time><span className="unread-dot" /> </div>)}</section>
}

export function SettingsView({ onToast }: { onToast: (message: string) => void }) {
  const [section, setSection] = useState('General')
  const sections = ['General', 'Institute', 'Camera settings', 'Security', 'Admins', 'Backup']
  return <div className="settings-layout"><nav className="settings-nav" aria-label="Settings sections">{sections.map((item) => <button type="button" key={item} className={section === item ? 'selected' : ''} onClick={() => setSection(item)}>{item}</button>)}</nav><section className="panel settings-panel"><div className="panel-heading"><div><h3>{section}</h3><span>Manage your attendance system preferences</span></div></div>{section === 'General' || section === 'Institute' ? <><FormInput label="Institute name" defaultValue="Madhav Institute of Technology and Science, Gwalior" /><FormInput label="Institute address" defaultValue="Gola Ka Mandir, Gwalior, Madhya Pradesh" /><div className="settings-row"><FormInput label="Contact number" defaultValue="0751-1234567" /><FormInput label="Email address" defaultValue="info@mitsgwalior.in" /></div></> : <div className="settings-placeholder"><span className="settings-placeholder-icon"><Icon name={section === 'Camera settings' ? 'camera' : section === 'Backup' ? 'upload' : 'settings'} size={22} /></span><h4>{section} settings</h4><p>Configure {section.toLowerCase()} preferences for your attendance workspace.</p></div>}<button className="button button-primary" type="button" onClick={() => onToast(`${section} settings saved.`)}>Save changes</button></section></div>
}

export function ProfileView({ adminName = 'Admin', onLogout, onToast, onSaveName }: ViewProps & { onSaveName?: (name: string) => void }) {
  const [name, setName] = useState(adminName)
  return <section className="panel profile-panel"><div className="panel-heading"><div><h3>Admin profile</h3><span>Manage your account information</span></div></div><div className="profile-hero"><span className="avatar profile-avatar">{initials(adminName)}</span><div><strong>{adminName}</strong><small>System administrator</small></div></div><FormInput label="Full name" value={name} onChange={(event) => setName(event.target.value)} /><FormInput label="Username" value={adminName.toLowerCase().replaceAll(' ', '.')} disabled /><div className="profile-actions"><button className="button button-primary" type="button" onClick={() => { if (name.trim()) onSaveName?.(name.trim()); onToast?.('Profile updated.') }}>Save changes</button><button className="button button-secondary" type="button" onClick={onLogout}>Sign out</button></div><div className="profile-security"><Icon name="alert" size={17} /><span>Connect profile and password changes to your authentication backend before production use.</span></div></section>
}

function Metric({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: string }) {
  return <div className="metric-card"><span className={`metric-dot ${tone}`} /><span className="metric-label">{label}</span><strong>{value}</strong><small>{delta}</small></div>
}

function FormInput({ label, name, type = 'text', required, defaultValue, value, disabled, onChange }: { label: string; name?: string; type?: string; required?: boolean; defaultValue?: string; value?: string; disabled?: boolean; onChange?: React.ChangeEventHandler<HTMLInputElement> }) {
  return <label className="form-field"><span>{label}</span><input name={name} type={type} required={required} defaultValue={defaultValue} value={value} disabled={disabled} onChange={onChange} /></label>
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="empty-state"><span><Icon name="search" size={20} /></span><strong>{title}</strong><p>{message}</p></div>
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="panel-heading"><div><h3>{title}</h3><span>{subtitle}</span></div></div>
}

function AnalyticsLine() {
  return <svg viewBox="0 0 660 220" preserveAspectRatio="none" role="img" aria-label="Attendance trend line rising across seven days"><defs><linearGradient id="analyticsFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#477cf6" stopOpacity=".16" /><stop offset="100%" stopColor="#477cf6" stopOpacity="0" /></linearGradient></defs><path className="chart-gridline" d="M0 24H660M0 80H660M0 136H660M0 192H660" /><path d="M0 150 C45 142 52 120 96 128 S150 88 190 105 S250 76 284 88 S336 54 376 72 S430 28 470 47 S520 69 565 39 S625 48 660 20 L660 210 L0 210Z" fill="url(#analyticsFill)" /><path className="chart-line" d="M0 150 C45 142 52 120 96 128 S150 88 190 105 S250 76 284 88 S336 54 376 72 S430 28 470 47 S520 69 565 39 S625 48 660 20" /></svg>
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function departmentShort(department: string) {
  const match = department.match(/\(([^)]+)\)/)
  return match?.[1] ?? department
}
