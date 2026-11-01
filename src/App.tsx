import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/auth/LoginPage'
import { AcceptInvitationPage } from './pages/auth/AcceptInvitationPage'
import { ForgotPasswordPage, ResetPasswordPage } from './pages/auth/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { LiveFeedPage } from './pages/LiveFeedPage'
import { MyAttendancePage } from './pages/MyAttendancePage'
import {
  EnrollmentWizardPage,
  ImportPage,
  PeopleListPage,
  PersonDetailPage,
  PersonFormPage,
} from './pages/people/PeoplePages'
import { OrgLayout } from './pages/org/OrgLayout'
import { GroupsPage, HolidaysPage, ShiftsPage, TimetablePage } from './pages/org/OrgPages'
import {
  AttendanceTodayPage,
  ExceptionsPage,
  LeavePage,
  SessionViewPage,
} from './pages/attendance/AttendancePages'
import { DeviceDetailPage, DevicesPage, RegisterDevicePage } from './pages/devices/DevicePages'
import { ReportsPage, ScheduledReportsPage } from './pages/reports/ReportsPages'
import { AdminLayout } from './pages/admin/AdminLayout'
import {
  AuditPage,
  NotificationsPage,
  OrganizationsPage,
  PrivacyPage,
  ProfilePage,
  SettingsPage,
  UsersPage,
} from './pages/admin/AdminPages'
import { ForbiddenPage, NotFoundPage } from './pages/system/SystemPages'
import { StudentInvitePage } from './pages/people/StudentInvitePage'
import './App.css'

const CameraAttendancePage = lazy(() =>
  import('./pages/devices/CameraAttendancePage').then((module) => ({
    default: module.CameraAttendancePage,
  })))

function HomePage() {
  const { user } = useAuth()
  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/platform" replace />
  }
  if (user?.role === 'STUDENT' || user?.role === 'EMPLOYEE') {
    return <Navigate to="/my-attendance" replace />
  }
  return <DashboardPage />
}

function SelfAttendanceRoute() {
  const { user } = useAuth()
  if (user?.role !== 'STUDENT' && user?.role !== 'EMPLOYEE') {
    return <Navigate to="/" replace />
  }
  return (
    <ProtectedRoute permission="my-attendance.view">
      <MyAttendancePage />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<AcceptInvitationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route
          path="/platform"
          element={
            <ProtectedRoute permission="platform.manage">
              <OrganizationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/organizations"
          element={
            <ProtectedRoute permission="platform.manage">
              <Navigate to="/platform" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-attendance"
          element={<SelfAttendanceRoute />}
        />
        <Route
          path="/live"
          element={
            <ProtectedRoute permission="live.view">
              <LiveFeedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/people"
          element={
            <ProtectedRoute permission="people.view">
              <PeopleListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/invite"
          element={
            <ProtectedRoute permission="students.invite">
              <StudentInvitePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/people/new"
          element={
            <ProtectedRoute permission="people.manage">
              <PersonFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/people/import"
          element={
            <ProtectedRoute permission="people.manage">
              <ImportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/people/enroll"
          element={
            <ProtectedRoute permission="people.manage">
              <EnrollmentWizardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/people/:id"
          element={
            <ProtectedRoute permission="people.view">
              <PersonDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organization"
          element={
            <ProtectedRoute permission="groups.manage">
              <OrgLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="groups" replace />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="shifts" element={<ShiftsPage />} />
          <Route path="holidays" element={<HolidaysPage />} />
        </Route>
        <Route
          path="/attendance"
          element={
            <ProtectedRoute permission="attendance.view">
              <AttendanceTodayPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance/session"
          element={
            <ProtectedRoute permission="attendance.view">
              <SessionViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exceptions"
          element={
            <ProtectedRoute permission="exceptions.resolve">
              <ExceptionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave"
          element={
            <ProtectedRoute permission="leave.review">
              <LeavePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices"
          element={
            <ProtectedRoute permission="devices.manage">
              <DevicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/camera"
          element={
            <ProtectedRoute permission="attendance.view">
              <Suspense fallback={<div className="view-stack"><p>Loading camera tools…</p></div>}>
                <CameraAttendancePage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices/register"
          element={
            <ProtectedRoute permission="devices.manage">
              <RegisterDevicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices/:id"
          element={
            <ProtectedRoute permission="devices.manage">
              <DeviceDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute permission="reports.export">
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/scheduled"
          element={
            <ProtectedRoute permission="reports.schedule">
              <ScheduledReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute permission="settings.manage">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="settings" replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
        </Route>
        <Route
          path="/notifications"
          element={
            <ProtectedRoute permission="dashboard.view">
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
