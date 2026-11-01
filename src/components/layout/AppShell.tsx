import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { initials } from '../../lib/format'
import { ConnectionBanner } from '../ui/Feedback'
import { Icon } from '../Icon'
import type { Permission } from '../../types/domain'

const nav: Array<{ to: string; label: string; mobileLabel?: string; icon: string; permission: Permission; section: 'Monitor' | 'Manage' | 'Tools'; mobile?: boolean }> = [
  { to: '/', label: 'Dashboard', mobileLabel: 'Home', icon: 'dashboard', permission: 'dashboard.view', section: 'Monitor', mobile: true },
  { to: '/platform', label: 'Organizations', mobileLabel: 'Orgs', icon: 'building', permission: 'platform.manage', section: 'Manage', mobile: true },
  { to: '/live', label: 'Live feed', mobileLabel: 'Live', icon: 'live', permission: 'live.view', section: 'Monitor', mobile: true },
  { to: '/people', label: 'People', icon: 'users', permission: 'people.view', section: 'Manage', mobile: true },
  { to: '/students/invite', label: 'Invite student', mobileLabel: 'Invite', icon: 'users', permission: 'students.invite', section: 'Manage' },
  { to: '/my-attendance', label: 'My attendance', mobileLabel: 'Mine', icon: 'clock', permission: 'my-attendance.view', section: 'Monitor', mobile: true },
  { to: '/organization/groups', label: 'Organization', mobileLabel: 'Org', icon: 'building', permission: 'groups.manage', section: 'Manage' },
  { to: '/attendance', label: 'Attendance', mobileLabel: 'Attend', icon: 'clock', permission: 'attendance.view', section: 'Monitor', mobile: true },
  { to: '/exceptions', label: 'Scan exceptions', mobileLabel: 'Issues', icon: 'alert', permission: 'exceptions.resolve', section: 'Monitor' },
  { to: '/devices', label: 'Devices', icon: 'device', permission: 'devices.manage', section: 'Manage' },
  { to: '/camera', label: 'Camera attendance', mobileLabel: 'Camera', icon: 'camera', permission: 'attendance.view', section: 'Tools', mobile: true },
  { to: '/reports', label: 'Reports', icon: 'file', permission: 'reports.export', section: 'Tools', mobile: true },
  { to: '/admin/settings', label: 'Admin', icon: 'settings', permission: 'settings.manage', section: 'Tools' },
]

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/platform': 'Platform organizations',
  '/live': 'Live feed',
  '/people': 'People',
  '/students/invite': 'Invite a student',
  '/my-attendance': 'My attendance',
  '/people/new': 'Add person',
  '/people/import': 'Bulk import',
  '/people/enroll': 'Enrolment wizard',
  '/organization/groups': 'Groups',
  '/organization/timetable': 'Courses & timetable',
  '/organization/shifts': 'Shifts',
  '/organization/holidays': 'Holidays',
  '/attendance': 'Today',
  '/attendance/session': 'Session view',
  '/exceptions': 'Exceptions queue',
  '/leave': 'Leave & excuses',
  '/devices': 'Devices',
  '/camera': 'Camera attendance',
  '/devices/register': 'Register device',
  '/reports': 'Reports',
  '/reports/scheduled': 'Scheduled reports',
  '/admin/users': 'Users & roles',
  '/admin/settings': 'Organization settings',
  '/admin/audit': 'Audit log',
  '/admin/privacy': 'Privacy & consent',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
}

export function AppShell() {
  const { user, logout, can } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('sas.theme')
    return savedTheme ? savedTheme === 'dark' : true
  })
  const [now, setNow] = useState(() => new Date())
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    localStorage.setItem('sas.theme', theme)
  }, [darkMode])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleSearchShortcut)
    return () => window.removeEventListener('keydown', handleSearchShortcut)
  }, [])

  const items = nav.filter((item) =>
    can(item.permission) &&
    (item.to !== '/my-attendance' || user?.role === 'EMPLOYEE' || user?.role === 'STUDENT')
  )
  const sections = (['Monitor', 'Manage', 'Tools'] as const)
    .map((section) => ({ section, items: items.filter((item) => item.section === section) }))
    .filter((section) => section.items.length > 0)
  const searchShortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'
  const title =
    titles[location.pathname] ??
    (location.pathname.startsWith('/people/')
      ? 'Person'
      : location.pathname.startsWith('/devices/')
        ? 'Device'
        : 'Smart Attendance')

  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const timeLabel = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const roleLabel = user
    ? {
        SUPER_ADMIN: 'Platform admin',
        ADMIN: 'Organization admin',
        TEACHER: 'Teacher',
        MANAGER: 'Manager',
        EMPLOYEE: 'Employee',
        STUDENT: 'Student',
      }[user.role]
    : ''

  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    return parts
  }, [location.pathname])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="sidebar-profile" onClick={() => navigate('/profile')} type="button">
          <span className="avatar">{initials(user?.name ?? 'A')}</span>
          <span className="profile-copy">
            <strong>{user?.name}</strong>
            <small>{roleLabel}</small>
          </span>
        </button>
        <nav className="nav-list" aria-label="Main navigation">
          {sections.map(({ section, items: sectionItems }) => (
            <div className="nav-section" key={section}>
              <span className="nav-section-label">{section}</span>
              {sectionItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  aria-label={item.label}
                  title={item.label}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon name={item.icon} />
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-mobile-label">{item.mobileLabel ?? item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        {can('devices.manage') && (
          <button className="sidebar-device-pill" type="button" onClick={() => navigate('/devices')}>
            <span className="status-pulse status-pending" />
            <Icon name="camera" size={15} />
            <span><strong>AMB82-Mini</strong><small>Device setup</small></span>
            <Icon name="chevron" size={14} />
          </button>
        )}
        <button
          className="sidebar-logout"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          type="button"
        >
          <Icon name="close" /> Sign out
        </button>
      </aside>

      <main className="main-panel">
        <ConnectionBanner online={online} />
        <header className="topbar">
          <div className="topbar-heading">
            <span className="eyebrow">
              {breadcrumbs.length ? breadcrumbs.join(' / ') : 'Home'}
            </span>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            {can('people.view') && <label className="global-search">
              <Icon name="search" size={17} />
              <input
                ref={searchInputRef}
                aria-label="Search people"
                placeholder="Search people, codes…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = e.currentTarget.value
                    navigate(`/people?q=${encodeURIComponent(q)}`)
                  }
                }}
              />
              <kbd aria-hidden="true">{searchShortcut}</kbd>
            </label>}
            <div className="date-label">
              <span>{dateLabel}</span>
              <strong>{timeLabel}</strong>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
              title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
              onClick={() => setDarkMode((current) => !current)}
            >
              <Icon name={darkMode ? 'sun' : 'moon'} />
            </button>
            {can('dashboard.view') && (
              <button className="icon-button" type="button" aria-label="Open notifications" title="Open notifications" onClick={() => navigate('/notifications')}>
                <Icon name="bell" />
              </button>
            )}
          </div>
        </header>
        <section className="page-content">
          <Outlet />
        </section>
      </main>

    </div>
  )
}
