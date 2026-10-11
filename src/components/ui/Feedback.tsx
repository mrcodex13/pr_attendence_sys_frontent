import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import { useAuth } from '../../auth/AuthContext'
import type { Permission } from '../../types/domain'

export function Toast({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  if (!message) return null
  return (
    <div className="toast-message" role="status">
      <span className="toast-check">
        <span>✓</span>
      </span>
      {message}
      <button type="button" aria-label="Dismiss notification" onClick={onDismiss}>
        ×
      </button>
    </div>
  )
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <Icon name="search" size={22} />
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty-state error-state">
      <Icon name="alert" size={22} />
      <strong>Something went wrong</strong>
      <p>{message}</p>
      {onRetry && (
        <button className="button button-secondary" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </div>
  )
}

export function PermissionGate({
  permission,
  children,
}: {
  permission: Permission
  children: ReactNode
}) {
  const { can } = useAuth()
  if (!can(permission)) {
    return (
      <div className="empty-state">
        <Icon name="shield" size={22} />
        <strong>You don’t have access</strong>
        <p>This page is hidden for your role. Ask an admin if you need it.</p>
      </div>
    )
  }
  return children
}

export function ConnectionBanner({ online }: { online: boolean }) {
  if (online) return null
  return (
    <div className="connection-banner" role="status">
      <Icon name="alert" size={14} /> You are offline. Scans will queue on devices and sync when the network returns.
    </div>
  )
}
