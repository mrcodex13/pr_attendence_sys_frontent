export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'MANAGER'] as const
export type Role = (typeof ROLES)[number]

export const PERSON_TYPES = ['STUDENT', 'EMPLOYEE'] as const
export type PersonType = (typeof PERSON_TYPES)[number]

export const RECORD_STATUSES = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'HALF_DAY'] as const
export type RecordStatus = (typeof RECORD_STATUSES)[number]

export const SCAN_RESULTS = [
  'ACCEPTED',
  'DUPLICATE',
  'UNKNOWN_PERSON',
  'INACTIVE_PERSON',
  'LOW_CONFIDENCE',
  'REJECTED',
] as const
export type ScanResult = (typeof SCAN_RESULTS)[number]

export const DEVICE_HEALTH = ['ONLINE', 'STALE', 'OFFLINE'] as const
export type DeviceHealth = (typeof DEVICE_HEALTH)[number]

export const ENROLLMENT_STATUSES = ['PENDING', 'ENROLLED', 'FAILED', 'REMOVED'] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export type Permission =
  | 'dashboard.view'
  | 'live.view'
  | 'people.view'
  | 'people.manage'
  | 'groups.manage'
  | 'courses.manage'
  | 'schedules.manage'
  | 'holidays.manage'
  | 'attendance.view'
  | 'attendance.correct'
  | 'exceptions.resolve'
  | 'leave.review'
  | 'devices.manage'
  | 'reports.export'
  | 'users.manage'
  | 'settings.manage'
  | 'audit.view'
  | 'privacy.manage'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  groupIds: string[]
}

export interface Person {
  id: string
  personCode: string
  type: PersonType
  name: string
  email: string
  phone: string
  photoUrl?: string
  status: 'ACTIVE' | 'INACTIVE'
  groupId: string
  rollNumber?: string
  semester?: string
  employeeId?: string
  designation?: string
  consentGiven: boolean
}

export interface Group {
  id: string
  name: string
  kind: 'CLASS' | 'DEPARTMENT' | 'TEAM'
  parentId?: string
  supervisorUserId?: string
}

export interface Course {
  id: string
  name: string
  code: string
  groupId: string
  teacherUserId: string
}

export interface ScheduleSlot {
  id: string
  courseId: string
  weekday: number
  start: string
  end: string
  room: string
}

export interface Shift {
  id: string
  name: string
  start: string
  end: string
  graceMinutes: number
  workingDays: number[]
}

export interface Holiday {
  id: string
  date: string
  name: string
  siteId: string
}

export interface Device {
  id: string
  deviceCode: string
  name: string
  siteId: string
  location: string
  direction: 'IN' | 'OUT' | 'EITHER'
  status: 'ACTIVE' | 'DISABLED'
  health: DeviceHealth
  lastSeenAt: string
  firmwareVersion: string
  configVersion: number
  queueDepth: number
  wifiRssi: number
}

export interface FaceEnrollment {
  id: string
  personId: string
  deviceId: string
  status: EnrollmentStatus
  enrolledAt?: string
}

export interface ScanEvent {
  eventId: string
  deviceId: string
  personId?: string
  rawLabel: string
  confidence: number
  scannedAt: string
  receivedAt: string
  result: ScanResult
  direction: 'IN' | 'OUT' | 'EITHER'
  displayName: string
}

export interface AttendanceRecord {
  id: string
  personId: string
  date: string
  scheduleId?: string
  status: RecordStatus
  firstIn?: string
  lastOut?: string
  minutesWorked?: number
  source: 'DEVICE' | 'MANUAL' | 'IMPORT'
  derivedFromEventIds: string[]
}

export interface Correction {
  id: string
  recordId: string
  oldStatus: RecordStatus
  newStatus: RecordStatus
  reason: string
  byUserId: string
  at: string
}

export interface LeaveRequest {
  id: string
  personId: string
  from: string
  to: string
  type: 'SICK' | 'CASUAL' | 'EXCUSE' | 'OTHER'
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reason: string
}

export interface AuditLog {
  id: string
  at: string
  actor: string
  action: string
  entity: string
  detail: string
}

export interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  tone: 'blue' | 'green' | 'red' | 'amber'
  icon: string
  read: boolean
}

export interface OrgSettings {
  name: string
  mode: 'SCHOOL' | 'COMPANY' | 'BOTH'
  timezone: string
  graceMinutes: number
  debounceSeconds: number
  minConfidence: number
  retentionDays: number
}

export interface DashboardStats {
  present: number
  late: number
  absent: number
  excused: number
  people: number
  exceptions: number
  rate: number
  trend: { day: string; present: number; late: number }[]
  groupRates: { name: string; rate: number }[]
  topAbsentees: { name: string; days: number }[]
}
