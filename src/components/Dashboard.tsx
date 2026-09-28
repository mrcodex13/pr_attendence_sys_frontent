import type { AttendanceRecord, Notice, Student } from '../types'
import { Icon } from './Icon'

interface DashboardProps {
  students: Student[]
  attendance: AttendanceRecord[]
  notices: Notice[]
  adminName: string
  onNavigate: (page: 'students' | 'attendance' | 'analytics' | 'notifications') => void
  onFilterAttendance: (status: 'present' | 'late' | 'absent') => void
  onMarkAttendance: () => void
}

export function Dashboard({ students, attendance, notices, adminName, onNavigate, onFilterAttendance, onMarkAttendance }: DashboardProps) {
  const present = attendance.filter((record) => record.status === 'present').length
  const late = attendance.filter((record) => record.status === 'late').length
  const absent = attendance.filter((record) => record.status === 'absent').length
  const rate = attendance.length ? Math.round(((present + late) / attendance.length) * 100) : 0
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const departmentRates = [
    ['CSE', 92], ['MaC', 91], ['CSBS', 90], ['CE', 90], ['AI', 89],
  ] as const

  return (
    <div className="dashboard-view">
      <section className="welcome-banner">
        <div><span className="eyebrow">MONDAY, SEPTEMBER 28, 2026</span><h2>{greeting}, {adminName.split(' ')[0]} <span>✦</span></h2><p>Your campus attendance at a glance.</p></div>
        <button className="button button-primary" type="button" onClick={onMarkAttendance}><Icon name="camera" /> Mark attendance <span aria-hidden="true">→</span></button>
        <div className="banner-orbit orbit-one" /><div className="banner-orbit orbit-two" />
      </section>

      <div className="kpi-grid">
        <KpiCard label="Total students" value={String(students.length).padStart(2, '0')} foot="Across all branches" icon="users" tone="blue" onClick={() => onNavigate('students')} />
        <KpiCard label="Present today" value={String(present).padStart(2, '0')} foot="Checked in successfully" icon="check" tone="green" onClick={() => onFilterAttendance('present')} />
        <KpiCard label="Late today" value={String(late).padStart(2, '0')} foot="Needs attention" icon="clock" tone="amber" onClick={() => onFilterAttendance('late')} />
        <KpiCard label="Absent today" value={String(absent).padStart(2, '0')} foot="Not checked in" icon="alert" tone="red" onClick={() => onFilterAttendance('absent')} />
        <div className="kpi-card rate-card">
          <div className="rate-ring" style={{ '--rate': `${rate}%` } as React.CSSProperties}><span>{rate}<small>%</small></span></div>
          <div><span className="kpi-label">Attendance rate</span><div className="rate-foot"><span className="status-pulse" /> Live snapshot</div></div>
        </div>
      </div>

      <div className="dashboard-grid dashboard-primary-grid">
        <section className="panel chart-panel">
          <PanelHeading title="Attendance overview" meta="Last 7 days" />
          <AttendanceChart />
          <div className="chart-legend"><span><i className="legend-dot blue" /> Present</span><span><i className="legend-dot pale" /> Attendance trend</span></div>
        </section>
        <section className="panel feed-panel">
          <PanelHeading title="Live attendance feed" link="View all" onLink={() => onNavigate('attendance')} />
          <div className="feed-list">
            {attendance.slice(0, 5).map((record) => <FeedRow key={record.id} record={record} />)}
          </div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-secondary-grid">
        <section className="panel">
          <PanelHeading title="Department performance" link="Analytics" onLink={() => onNavigate('analytics')} />
          <div className="department-bars">{departmentRates.map(([name, value]) => <div className="department-row" key={name}><span>{name}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${value}%` }} /></div><strong>{value}%</strong></div>)}</div>
        </section>
        <section className="panel system-panel">
          <PanelHeading title="System health" meta="All services running" />
          {['Camera network', 'Face recognition', 'Attendance database'].map((item) => <div className="system-row" key={item}><span className="system-check"><Icon name="check" size={14} /></span><span>{item}</span><small>Operational</small></div>)}
          <div className="system-footer"><span className="status-pulse" /> No issues detected</div>
        </section>
        <section className="panel alerts-panel">
          <PanelHeading title="Recent alerts" link="All alerts" onLink={() => onNavigate('notifications')} />
          {notices.slice(0, 3).map((notice) => <div className="alert-row" key={notice.title}><span className={`notice-icon ${notice.tone}`}><Icon name={notice.icon} size={15} /></span><div><strong>{notice.title}</strong><small>{notice.time}</small></div></div>)}
        </section>
      </div>
    </div>
  )
}

function KpiCard({ label, value, foot, icon, tone, onClick }: { label: string; value: string; foot: string; icon: string; tone: string; onClick: () => void }) {
  return <button className="kpi-card" type="button" onClick={onClick}><div className="kpi-card-top"><span className={`kpi-icon ${tone}`}><Icon name={icon} /></span><span className="kpi-label">{label}</span><span className="kpi-arrow">↗</span></div><strong className={`kpi-value ${tone}`}>{value}</strong><small className="kpi-foot">{foot}</small></button>
}

function PanelHeading({ title, meta, link, onLink }: { title: string; meta?: string; link?: string; onLink?: () => void }) {
  return <div className="panel-heading"><div><h3>{title}</h3>{meta && <span>{meta}</span>}</div>{link && <button type="button" onClick={onLink}>{link} <span aria-hidden="true">→</span></button>}</div>
}

function FeedRow({ record }: { record: AttendanceRecord }) {
  return <div className="feed-row"><span className="avatar row-avatar">{record.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div className="feed-copy"><strong>{record.name}</strong><small>{record.time} · {record.id}</small></div><span className={`status-pill ${record.status}`}>{record.status}</span></div>
}

function AttendanceChart() {
  return <div className="chart-area" role="img" aria-label="Attendance line chart trending upward over the last seven days"><div className="chart-y-labels"><span>500</span><span>400</span><span>300</span><span>200</span></div><svg viewBox="0 0 660 190" preserveAspectRatio="none"><defs><linearGradient id="attendanceFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#477cf6" stopOpacity=".18" /><stop offset="100%" stopColor="#477cf6" stopOpacity="0" /></linearGradient></defs><path className="chart-gridline" d="M0 20H660M0 66H660M0 112H660M0 158H660" /><path d="M0 112 C45 106 55 94 95 100 S145 81 188 92 S238 51 282 70 S330 80 376 62 S425 31 470 51 S520 65 565 35 S620 42 660 18 L660 175 L0 175Z" fill="url(#attendanceFill)" /><path className="chart-line" d="M0 112 C45 106 55 94 95 100 S145 81 188 92 S238 51 282 70 S330 80 376 62 S425 31 470 51 S520 65 565 35 S620 42 660 18" /><circle cx="660" cy="18" r="4.5" className="chart-point" /></svg><div className="chart-x-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div>
}
