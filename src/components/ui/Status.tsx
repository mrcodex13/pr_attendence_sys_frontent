import type { DeviceHealth, RecordStatus, ScanResult } from '../../types/domain'

const statusMeta: Record<string, { label: string; icon: string; className: string }> = {
  ACTIVE: { label: 'Active', icon: '✓', className: 'present' },
  PRESENT: { label: 'Present', icon: '✓', className: 'present' },
  LATE: { label: 'Late', icon: '⏱', className: 'late' },
  ABSENT: { label: 'Absent', icon: '✕', className: 'absent' },
  EXCUSED: { label: 'Excused', icon: 'i', className: 'excused' },
  HALF_DAY: { label: 'Half day', icon: '½', className: 'late' },
  UNKNOWN: { label: 'Unknown', icon: '?', className: 'unknown' },
  QUEUED: { label: 'Queued', icon: '…', className: 'queued' },
  ACCEPTED: { label: 'Accepted', icon: '✓', className: 'present' },
  DUPLICATE: { label: 'Duplicate', icon: '2', className: 'excused' },
  UNKNOWN_PERSON: { label: 'Unknown face', icon: '?', className: 'unknown' },
  INACTIVE_PERSON: { label: 'Inactive', icon: '✕', className: 'absent' },
  LOW_CONFIDENCE: { label: 'Low confidence', icon: '!', className: 'late' },
  REJECTED: { label: 'Rejected', icon: '✕', className: 'absent' },
}

export function StatusBadge({
  value,
}: {
  value: RecordStatus | ScanResult | 'UNKNOWN' | 'QUEUED' | string
}) {
  const meta = statusMeta[value] ?? { label: value, icon: '•', className: 'unknown' }
  return (
    <span className={`status-pill ${meta.className}`}>
      <span aria-hidden="true">{meta.icon}</span> {meta.label}
    </span>
  )
}

export function DeviceHealthDot({ health }: { health: DeviceHealth }) {
  return (
    <span className={`health-dot health-${health.toLowerCase()}`}>
      <i />
      {health === 'ONLINE' ? 'Online' : health === 'STALE' ? 'Stale' : 'Offline'}
    </span>
  )
}
