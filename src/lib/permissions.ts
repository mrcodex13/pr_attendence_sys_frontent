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
  'reports.schedule',
  'users.manage',
  'my-attendance.view',
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
  'students.invite',
]

const SELF_SERVICE: Permission[] = ['my-attendance.view']

const byRole: Record<Role, Permission[]> = {
  SUPER_ADMIN: ['platform.manage'],
  ADMIN: ALL,
  TEACHER: teacher,
  MANAGER: teacher.filter((permission) => permission !== 'students.invite'),
  EMPLOYEE: SELF_SERVICE,
  STUDENT: SELF_SERVICE,
}

export function hasPermission(role: Role | undefined, permission: Permission) {
  if (!role) return false
  return byRole[role].includes(permission)
}

export function can(role: Role | undefined, ...permissions: Permission[]) {
  return permissions.every((p) => hasPermission(role, p))
}
