export type PageId =
  | 'dashboard'
  | 'students'
  | 'attendance'
  | 'reports'
  | 'analytics'
  | 'notifications'
  | 'settings'
  | 'profile'

export type AttendanceStatus = 'present' | 'late' | 'absent'

export interface Student {
  id: string
  name: string
  dept: string
  semester: string
  email: string
  phone: string
  pct: number
  present: number
  absent: number
  late: number
  total: number
}

export interface AttendanceRecord {
  time: string
  name: string
  id: string
  dept: string
  status: AttendanceStatus
}

export interface Notice {
  title: string
  description: string
  time: string
  tone: 'blue' | 'green' | 'red' | 'amber'
  icon: 'users' | 'check' | 'camera' | 'file' | 'alert'
}
