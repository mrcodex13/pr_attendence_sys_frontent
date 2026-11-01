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
  const numericValue = Number(value.replaceAll(',', ''))
  const valueTone = Number.isFinite(numericValue) && numericValue === 0 ? 'neutral' : tone
  return (
    <Tag className="kpi-card" onClick={onClick} type={onClick ? 'button' : undefined}>
      <div className="kpi-card-top">
        <span className={`kpi-icon ${tone}`}>
          <Icon name={icon} />
        </span>
        <span className="kpi-label">{label}</span>
        {onClick && <span className="kpi-arrow">→</span>}
      </div>
      <strong className={`kpi-value ${valueTone}`}>{value}</strong>
      {foot && <span className="kpi-foot">{foot}</span>}
    </Tag>
  )
}

export function TrendChart({
  series,
  people,
  today,
}: {
  series: { day: string; present: number; late: number }[]
  people: number
  today?: string
}) {
  const currentDay = today ?? new Intl.DateTimeFormat('en-CA').format(new Date())
  const w = 420
  const h = 132
  const currentDate = new Date(`${currentDay}T12:00:00`)
  const seriesByDay = new Map(series.map((point) => [point.day, point]))
  const chartSeries = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(currentDate)
    date.setDate(currentDate.getDate() - (6 - index))
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return seriesByDay.get(day) ?? { day, present: 0, late: 0 }
  })
  const maxRate = Math.max(
    10,
    Math.min(100, Math.ceil(Math.max(...chartSeries.map((point) => (
      people > 0 ? (Math.min(point.present + point.late, people) / people) * 100 : 0
    ))) / 5) * 5),
  )
  const points = chartSeries.map((point, index) => {
    const attended = Math.min(point.present + point.late, people)
    const rate = people > 0 ? Math.round((attended / people) * 100) : 0
    return {
      ...point,
      rate,
      x: ((index + 0.5) / chartSeries.length) * w,
      y: h - (rate / maxRate) * h,
    }
  })
  const todayIndex = points.findIndex((point) => point.day === currentDay)
  const historicalPoints = points.slice(0, todayIndex >= 0 ? todayIndex : points.length)
  const todayPoint = todayIndex >= 0 ? points[todayIndex] : null
  const historicalLine = historicalPoints.map((point) => `${point.x},${point.y}`).join(' ')
  const lastHistoryPoint = historicalPoints.at(-1)
  const todayLabel = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  return (
    <div className="chart-area" role="img" aria-label="Seven-day attendance rate, measured as the percentage of active people with a present or late record. Today's value is still updating.">
      <div className="chart-y-labels">
        <span>{maxRate}%</span>
        <span>{maxRate / 2}%</span>
        <span>0%</span>
      </div>
      <div className="chart-plot">
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
          {[0, maxRate / 2, maxRate].map((rate) => {
            const y = h - (rate / maxRate) * h
            return <line key={rate} className="chart-grid-line" x1="0" x2={w} y1={y} y2={y} />
          })}
          {historicalLine && <polyline className="chart-line" points={historicalLine} />}
          {todayPoint && lastHistoryPoint && (
            <line
              className="chart-today-line"
              x1={lastHistoryPoint.x}
              y1={lastHistoryPoint.y}
              x2={todayPoint.x}
              y2={todayPoint.y}
            />
          )}
          {points.map((point) => (
            <g key={point.day}>
              <title>
                {todayLabel(point.day)}: {point.rate}% attended ({point.present} present, {point.late} late)
                {point.day === currentDay ? ' · Still updating today' : ''}
              </title>
              <circle
                className={`chart-point ${point.day === currentDay ? 'chart-point-today' : ''}`}
                cx={point.x}
                cy={point.y}
                r={point.day === currentDay ? 5 : 4}
              />
            </g>
          ))}
        </svg>
        <div className="chart-x-labels">
          {points.map((point) => (
            <span key={point.day} className={point.day === currentDay ? 'chart-today-label' : ''} title={point.day === currentDay ? 'Today · still updating' : point.day}>
              {todayLabel(point.day)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DonutChart({
  value,
  label,
  attended,
  people,
  notScanned,
}: {
  value: number
  label: string
  attended: number
  people: number
  notScanned: number
}) {
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
        <p className="rate-card-description">{attended.toLocaleString()} of {people.toLocaleString()} present or late</p>
        <p className="rate-card-remaining">
          {notScanned.toLocaleString()} not yet scanned
        </p>
      </div>
    </div>
  )
}

export function GroupBarChart({ rows }: { rows: { name: string; rate: number }[] }) {
  if (rows.length === 0) {
    return <div className="chart-empty chart-empty-compact" role="status">No active groups to show attendance rates for.</div>
  }

  return (
    <div className="department-bars">
      {rows.map((row) => (
        <div className="department-row" key={row.name}>
          <span>{formatGroupName(row.name)}</span>
          <span className="bar-track">
            <i className="bar-fill" style={{ width: `${Math.min(100, Math.max(0, row.rate))}%` }} />
          </span>
          <strong>{row.rate}%</strong>
        </div>
      ))}
    </div>
  )
}

function formatGroupName(name: string) {
  const generatedName = /^G_(\d+)$/i.exec(name.trim())
  return generatedName ? `Group ${generatedName[1]}` : name
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
          {formatTime(scan.scannedAt)} · {scan.source === 'CAMERA' ? 'Camera' : 'Device'} · {scan.rawLabel} · {(scan.confidence * 100).toFixed(0)}%
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
