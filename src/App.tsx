import { useState } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { AppShell } from './components/AppShell'
import { Dashboard } from './components/Dashboard'
import {
  AnalyticsView,
  AttendanceView,
  NotificationsView,
  ProfileView,
  ReportsView,
  SettingsView,
  StudentsView,
} from './components/ManagementViews'
import { initialAttendance, initialStudents, notices } from './data'
import type { AttendanceStatus, PageId, Student } from './types'
import './App.css'

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [adminName, setAdminName] = useState('Admin User')
  const [page, setPage] = useState<PageId>('dashboard')
  const [students, setStudents] = useState(initialStudents)
  const [attendance, setAttendance] = useState(initialAttendance)
  const [toast, setToast] = useState('')
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceStatus | undefined>()
  const [globalSearch, setGlobalSearch] = useState('')

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  function navigate(nextPage: PageId) {
    setPage(nextPage)
    if (nextPage !== 'attendance') setAttendanceFilter(undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openAttendance(status: AttendanceStatus) {
    setAttendanceFilter(status)
    setPage('attendance')
  }

  function addStudent(student: Student) {
    if (students.some((existing) => existing.id.toLowerCase() === student.id.toLowerCase())) {
      notify(`A student with ID ${student.id} already exists.`)
      return false
    }
    setStudents((current) => [student, ...current])
    return true
  }

  function markAttendance() {
    const unmarked = students.find((student) => !attendance.some((record) => record.id === student.id))
    if (!unmarked) {
      notify('All sample students already have an attendance record.')
      return
    }
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    setAttendance((current) => [{ id: unmarked.id, name: unmarked.name, dept: unmarked.dept, time, status: 'present' }, ...current])
    notify(`${unmarked.name} marked present.`)
  }

  if (!isSignedIn) {
    return <AuthScreen onSignIn={(name) => { setAdminName(name); setIsSignedIn(true) }} />
  }

  return (
    <AppShell
      page={page}
      onNavigate={navigate}
      onSearch={(value) => {
        setGlobalSearch(value)
        if (value.trim()) setPage('students')
      }}
      onLogout={() => { setIsSignedIn(false); setPage('dashboard') }}
      adminName={adminName}
    >
      {page === 'dashboard' && <Dashboard students={students} attendance={attendance} notices={notices} adminName={adminName} onNavigate={navigate} onFilterAttendance={openAttendance} onMarkAttendance={markAttendance} />}
      {page === 'students' && <StudentsView students={students} attendance={attendance} globalSearch={globalSearch} onAddStudent={addStudent} onToast={notify} />}
      {page === 'attendance' && <AttendanceView students={students} attendance={attendance} initialFilter={attendanceFilter} onAddStudent={addStudent} onToast={notify} />}
      {page === 'reports' && <ReportsView students={students} attendance={attendance} onAddStudent={addStudent} onToast={notify} />}
      {page === 'analytics' && <AnalyticsView students={students} attendance={attendance} onAddStudent={addStudent} onToast={notify} />}
      {page === 'notifications' && <NotificationsView notices={notices} onToast={notify} />}
      {page === 'settings' && <SettingsView onToast={notify} />}
      {page === 'profile' && <ProfileView students={students} attendance={attendance} onAddStudent={addStudent} onToast={notify} adminName={adminName} onSaveName={(name) => name && setAdminName(name)} onLogout={() => { setIsSignedIn(false); setPage('dashboard') }} />}
      {toast && <div className="toast-message" role="status"><span className="toast-check"><span>✓</span></span>{toast}<button type="button" aria-label="Dismiss notification" onClick={() => setToast('')}>×</button></div>}
    </AppShell>
  )
}

export default App
