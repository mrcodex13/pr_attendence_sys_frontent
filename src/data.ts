import type { AttendanceRecord, Notice, Student } from './types'

export const departments = [
  'Computer Science & Engineering (CSE)',
  'Electronics Engineering (EC)',
  'Mechanical Engineering (ME)',
  'Civil Engineering (CE)',
  'Internet of Things (IoT)',
  'Artificial Intelligence & Machine Learning (AIML)',
]

export const initialStudents: Student[] = [
  { id: 'CS2021001', name: 'Rahul Sharma', dept: departments[0], semester: '4th Semester', email: 'rahul@example.com', phone: '9876543210', pct: 92, present: 28, absent: 1, late: 2, total: 31 },
  { id: 'CS2021002', name: 'Priya Patel', dept: departments[0], semester: '4th Semester', email: 'priya@example.com', phone: '9876543211', pct: 85, present: 26, absent: 2, late: 3, total: 31 },
  { id: 'CS2021003', name: 'Aman Singh', dept: departments[0], semester: '4th Semester', email: 'aman@example.com', phone: '9876543212', pct: 75, present: 23, absent: 5, late: 3, total: 31 },
  { id: 'CS2021004', name: 'Neha Gupta', dept: departments[1], semester: '2nd Semester', email: 'neha@example.com', phone: '9876543213', pct: 88, present: 27, absent: 2, late: 2, total: 31 },
  { id: 'CS2021005', name: 'Vivek Yadav', dept: departments[2], semester: '6th Semester', email: 'vivek@example.com', phone: '9876543214', pct: 89, present: 26, absent: 3, late: 2, total: 31 },
  { id: 'CS2021006', name: 'Kajal Verma', dept: departments[3], semester: '2nd Semester', email: 'kajal@example.com', phone: '9876543215', pct: 90, present: 28, absent: 2, late: 1, total: 31 },
  { id: '0901IT231001', name: 'Aarav Mehta', dept: departments[4], semester: '3rd Semester', email: 'aarav@example.com', phone: '9800000001', pct: 87, present: 27, absent: 3, late: 1, total: 31 },
  { id: '0901CS231101', name: 'Isha Kapoor', dept: departments[5], semester: '3rd Semester', email: 'isha@example.com', phone: '9800000101', pct: 88, present: 27, absent: 3, late: 1, total: 31 },
]

export const initialAttendance: AttendanceRecord[] = [
  { time: '09:31', name: 'Rahul Sharma', id: 'CS2021001', dept: departments[0], status: 'present' },
  { time: '09:32', name: 'Priya Patel', id: 'CS2021002', dept: departments[0], status: 'present' },
  { time: '09:33', name: 'Aman Singh', id: 'CS2021003', dept: departments[0], status: 'late' },
  { time: '09:33', name: 'Neha Gupta', id: 'CS2021004', dept: departments[1], status: 'present' },
  { time: '09:34', name: 'Vivek Yadav', id: 'CS2021005', dept: departments[2], status: 'present' },
  { time: '09:34', name: 'Kajal Verma', id: 'CS2021006', dept: departments[3], status: 'present' },
  { time: '—', name: 'Sanjay Rathi', id: 'CS2021007', dept: departments[2], status: 'absent' },
  { time: '09:35', name: 'Aarav Mehta', id: '0901IT231001', dept: departments[4], status: 'present' },
  { time: '09:36', name: 'Isha Kapoor', id: '0901CS231101', dept: departments[5], status: 'present' },
]

export const notices: Notice[] = [
  { icon: 'users', tone: 'blue', title: 'New student registered', description: 'Aarav Mehta was added successfully.', time: 'Just now' },
  { icon: 'check', tone: 'green', title: 'Face registration completed', description: 'Priya Patel face registration completed.', time: '10 min ago' },
  { icon: 'camera', tone: 'blue', title: 'Camera connected', description: 'Main Gate Camera is connected successfully.', time: '15 min ago' },
  { icon: 'file', tone: 'amber', title: 'Monthly report exported', description: 'Monthly attendance report is ready.', time: '1 hour ago' },
  { icon: 'alert', tone: 'red', title: 'Unknown face detected', description: 'An unrecognised face was detected at 09:45 AM.', time: '2 hours ago' },
]

export const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'students', label: 'Students', icon: 'users' },
  { id: 'attendance', label: 'Attendance', icon: 'clock' },
  { id: 'reports', label: 'Reports', icon: 'file' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
] as const

export const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  students: 'Students',
  attendance: 'Live Attendance',
  reports: 'Reports',
  analytics: 'Analytics',
  notifications: 'Notifications',
  settings: 'Settings',
  profile: 'Admin Profile',
}
