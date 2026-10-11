import type { Permission, Role } from '../types/domain'

const ALL: Permission[] = [
  'dashboard.view',
  'live.view',
  'people.view',
  'people.manage',
  'groups.manage',
  'courses.manage',
  'schedules.manage',
  'holidays.manage',
  'attendance.view',
  'attendance.correct',
  'exceptions.resolve',
  'leave.review',
  'devices.manage',
  'reports.export',
  'users.manage',
  'settings.manage',
  'audit.view',
  'privacy.manage',
]

const teacher: Permission[] = [
  'dashboard.view',
  'live.view',
  'people.view',
  'attendance.view',
  'attendance.correct',
  'exceptions.resolve',
  'leave.review',
  'reports.export',
]

const byRole: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== 'users.manage'),
  TEACHER: teacher,
  MANAGER: teacher,
}

export function hasPermission(role: Role | undefined, permission: Permission) {
  if (!role) return false
  return byRole[role].includes(permission)
}

export function can(role: Role | undefined, ...permissions: Permission[]) {
  return permissions.every((p) => hasPermission(role, p))
}
