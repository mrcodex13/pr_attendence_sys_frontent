import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/auth/LoginPage'
import { ForgotPasswordPage, ResetPasswordPage } from './pages/auth/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { LiveFeedPage } from './pages/LiveFeedPage'
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
  PrivacyPage,
  ProfilePage,
  SettingsPage,
  UsersPage,
} from './pages/admin/AdminPages'
import { ForbiddenPage, NotFoundPage } from './pages/system/SystemPages'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
        <Route path="/" element={<DashboardPage />} />
        <Route path="/live" element={<LiveFeedPage />} />
        <Route path="/people" element={<PeopleListPage />} />
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
        <Route path="/people/:id" element={<PersonDetailPage />} />
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
        <Route path="/attendance" element={<AttendanceTodayPage />} />
        <Route path="/attendance/session" element={<SessionViewPage />} />
        <Route path="/exceptions" element={<ExceptionsPage />} />
        <Route path="/leave" element={<LeavePage />} />
        <Route
          path="/devices"
          element={
            <ProtectedRoute permission="devices.manage">
              <DevicesPage />
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
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/scheduled" element={<ScheduledReportsPage />} />
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
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
