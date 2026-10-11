import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { initials } from '../../lib/format'
import { ConnectionBanner } from '../ui/Feedback'
import { Icon } from '../Icon'
import type { Permission } from '../../types/domain'

const nav: Array<{ to: string; label: string; icon: string; permission: Permission; mobile?: boolean }> = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', permission: 'dashboard.view', mobile: true },
  { to: '/live', label: 'Live feed', icon: 'live', permission: 'live.view', mobile: true },
  { to: '/people', label: 'People', icon: 'users', permission: 'people.view', mobile: true },
  { to: '/organization/groups', label: 'Organization', icon: 'building', permission: 'groups.manage' },
  { to: '/attendance', label: 'Attendance', icon: 'clock', permission: 'attendance.view', mobile: true },
  { to: '/exceptions', label: 'Exceptions', icon: 'alert', permission: 'exceptions.resolve' },
  { to: '/devices', label: 'Devices', icon: 'device', permission: 'devices.manage' },
  { to: '/reports', label: 'Reports', icon: 'file', permission: 'reports.export', mobile: true },
  { to: '/admin/settings', label: 'Admin', icon: 'settings', permission: 'settings.manage' },
  { to: '/notifications', label: 'Alerts', icon: 'bell', permission: 'dashboard.view' },
]

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/live': 'Live feed',
  '/people': 'People',
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
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('sas.theme')
    return savedTheme ? savedTheme === 'dark' : document.documentElement.dataset.theme === 'dark'
  })
  const [now, setNow] = useState(() => new Date())
  const [online, setOnline] = useState(navigator.onLine)
  const [sessionExpired, setSessionExpired] = useState(false)

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

  const items = nav.filter((item) => can(item.permission) || item.to === '/notifications')
  const title =
    titles[location.pathname] ??
    (location.pathname.startsWith('/people/')
      ? 'Person'
      : location.pathname.startsWith('/devices/')
        ? 'Device'
        : 'Smart Attendance')

  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const timeLabel = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const roleLabel = user?.role.replace('_', ' ') ?? ''

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
          <span className="online-dot" />
        </button>
        <nav className="nav-list" aria-label="Main navigation">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon name={item.icon} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-status">
          <div className="status-line">
            <span className="status-pulse" /> Devices reporting
          </div>
          <small>
            <Icon name="camera" size={13} /> AMB82-Mini · 1 offline
          </small>
          <small>
            <Icon name="check" size={13} /> Blueprint v1.0
          </small>
        </div>
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
              {breadcrumbs.length ? breadcrumbs.join(' / ') : 'home'}
            </span>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <Icon name="search" size={17} />
              <input
                aria-label="Search people"
                placeholder="Search people, codes…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = e.currentTarget.value
                    navigate(`/people?q=${encodeURIComponent(q)}`)
                  }
                }}
              />
              <kbd>⌘ K</kbd>
            </label>
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
            <button className="icon-button" type="button" aria-label="Notifications" onClick={() => navigate('/notifications')}>
              <Icon name="bell" />
            </button>
            <button className="topbar-admin" type="button" onClick={() => navigate('/profile')}>
              <span className="avatar avatar-small">{initials(user?.name ?? 'A')}</span>
              <strong>{user?.name.split(' ')[0]}</strong>
            </button>
          </div>
        </header>
        <section className="page-content">
          <Outlet />
        </section>
      </main>

      {sessionExpired && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>Session expired</h2>
            <p>Sign in again to continue. Unsaved form data on this page may be lost.</p>
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setSessionExpired(false)
                logout()
                navigate('/login')
              }}
            >
              Sign in
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
