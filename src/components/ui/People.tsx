import { initials } from '../../lib/format'

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`avatar ${size === 'sm' ? 'avatar-small' : ''} ${size === 'lg' ? 'avatar-lg' : ''}`}>{initials(name)}</span>
}

export function PersonSummary({
  name,
  sub,
}: {
  name: string
  sub?: string
}) {
  return (
    <div className="student-cell">
      <Avatar name={name} size="sm" />
      <span>
        <strong>{name}</strong>
        {sub && <small>{sub}</small>}
      </span>
    </div>
  )
}
