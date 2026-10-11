import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { Permission } from '../types/domain'

export function ProtectedRoute({
  children,
  permission,
}: {
  children: React.ReactNode
  permission?: Permission
}) {
  const { user, can } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (permission && !can(permission)) {
    return <Navigate to="/403" replace />
  }
  return children
}
