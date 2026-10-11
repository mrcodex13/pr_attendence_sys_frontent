import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../Icon'
import { Avatar } from './People'
import { DeviceHealthDot } from './Status'
import { StatusBadge } from './Status'
import { formatTime } from '../../lib/format'
import type { Device, ScanEvent } from '../../types/domain'

export function StatCard({
  label,
  value,
  foot,
  icon,
  tone,
  onClick,
}: {
  label: string
  value: string
  foot?: string
  icon: string
  tone: 'blue' | 'green' | 'amber' | 'red'
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className="kpi-card" onClick={onClick} type={onClick ? 'button' : undefined}>
      <div className="kpi-card-top">
        <span className={`kpi-icon ${tone}`}>
          <Icon name={icon} />
        </span>
        <span className="kpi-label">{label}</span>
        {onClick && <span className="kpi-arrow">→</span>}
      </div>
      <strong className={`kpi-value ${tone}`}>{value}</strong>
      {foot && <span className="kpi-foot">{foot}</span>}
    </Tag>
  )
}

export function TrendChart({
  series,
}: {
  series: { day: string; present: number; late: number }[]
}) {
  const max = Math.max(...series.map((s) => s.present + s.late), 1)
  const w = 320
  const h = 120
  const pts = series
    .map((s, i) => {
      const x = (i / Math.max(series.length - 1, 1)) * w
      const y = h - ((s.present + s.late) / max) * h
      return `${x},${y}`
    })
    .join(' ')
  return (
    <div className="chart-area">
      <div className="chart-y-labels">
        <span>{max}</span>
        <span>0</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Attendance trend">
        <polyline className="chart-line" points={pts} />
        {series.map((s, i) => {
          const x = (i / Math.max(series.length - 1, 1)) * w
          const y = h - ((s.present + s.late) / max) * h
          return <circle key={s.day} className="chart-point" cx={x} cy={y} r="4" />
        })}
      </svg>
      <div className="chart-x-labels">
        {series.map((s) => (
          <span key={s.day}>{s.day}</span>
        ))}
      </div>
    </div>
  )
}

export function DonutChart({ value, label }: { value: number; label: string }) {
  return (
    <div className="rate-card">
      <div className="rate-ring" style={{ '--rate': `${value}%` } as CSSProperties}>
        <span>
          {value}
          <small>%</small>
        </span>
      </div>
      <div>
        <strong>{label}</strong>
        <p className="muted">{value}% present or late today</p>
      </div>
    </div>
  )
}

export function GroupBarChart({ rows }: { rows: { name: string; rate: number }[] }) {
  return (
    <div className="department-bars">
      {rows.map((row) => (
        <div className="department-row" key={row.name}>
          <span>{row.name}</span>
          <span className="bar-track">
            <i className="bar-fill" style={{ width: `${row.rate}%` }} />
          </span>
          <strong>{row.rate}%</strong>
        </div>
      ))}
    </div>
  )
}

export function AttendanceCalendar({
  days,
}: {
  days: { date: string; status: string }[]
}) {
  return (
    <div className="heat-grid" role="img" aria-label="Attendance heatmap">
      {days.map((d) => (
        <span key={d.date} className={`heat-cell heat-${d.status.toLowerCase()}`} title={`${d.date} ${d.status}`}>
          {d.date.slice(-2)}
        </span>
      ))}
    </div>
  )
}

export function LiveScanCard({ scan }: { scan: ScanEvent }) {
  return (
    <article className="live-scan-card">
      <Avatar name={scan.displayName} />
      <div className="feed-copy">
        <strong>
          {scan.personId ? <Link to={`/people/${scan.personId}`}>{scan.displayName}</Link> : scan.displayName}
        </strong>
        <small>
          {formatTime(scan.scannedAt)} · {scan.rawLabel} · {(scan.confidence * 100).toFixed(0)}%
        </small>
      </div>
      <StatusBadge value={scan.result === 'ACCEPTED' ? 'PRESENT' : scan.result} />
    </article>
  )
}

export function DeviceCard({
  device,
  onOpen,
}: {
  device: Device
  onOpen: () => void
}) {
  return (
    <button className="device-card" type="button" onClick={onOpen}>
      <div className="device-card-top">
        <strong>{device.name}</strong>
        <DeviceHealthDot health={device.health} />
      </div>
      <small>
        {device.deviceCode} · {device.location}
      </small>
      <div className="device-card-meta">
        <span>Queue {device.queueDepth}</span>
        <span>FW {device.firmwareVersion}</span>
      </div>
    </button>
  )
}

export function PersonCard({
  name,
  code,
  extra,
}: {
  name: string
  code: string
  extra?: ReactNode
}) {
  return (
    <div className="person-card">
      <Avatar name={name} />
      <div>
        <strong>{name}</strong>
        <small>{code}</small>
      </div>
      {extra}
    </div>
  )
}
