import { useEffect, useState } from 'react'
import { navItems, pageTitles } from '../data'
import type { PageId } from '../types'
import { Icon } from './Icon'

interface AppShellProps {
  page: PageId
  onNavigate: (page: PageId) => void
  onSearch: (value: string) => void
  onLogout: () => void
  adminName: string
  children: React.ReactNode
}

export function AppShell({ page, onNavigate, onSearch, onLogout, adminName, children }: AppShellProps) {
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const shortName = adminName.split(' ')[0] || 'Admin'
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const timeLabel = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="sidebar-profile" onClick={() => onNavigate('profile')} type="button">
          <span className="avatar">{initials(adminName)}</span>
          <span className="profile-copy"><strong>{adminName}</strong><small>Administrator</small></span>
          <span className="online-dot" />
        </button>
        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => onNavigate(item.id)} type="button">
              <Icon name={item.icon} /><span className="nav-label">{item.label}</span>
              {item.id === 'notifications' && <span className="nav-count">3</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-status">
          <div className="status-line"><span className="status-pulse" /> All systems operational</div>
          <small><Icon name="camera" size={13} /> AMB82-Mini · Connected</small>
          <small><Icon name="check" size={13} /> Version 1.0.0</small>
        </div>
        <button className="sidebar-logout" onClick={onLogout} type="button"><Icon name="close" /> Sign out</button>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-heading"><span className="eyebrow">SMART ATTENDANCE</span><h1>{pageTitles[page]}</h1></div>
          <div className="topbar-actions">
            <label className="global-search">
              <Icon name="search" size={17} />
              <input aria-label="Search students" placeholder="Search students, IDs..." onChange={(event) => onSearch(event.target.value)} />
              <kbd>⌘ K</kbd>
            </label>
            <div className="date-label"><span>{dateLabel}</span><strong>{timeLabel}</strong></div>
            <div className="theme-control">
              <button className="icon-button" type="button" aria-label="Change theme" onClick={() => setThemeMenuOpen((open) => !open)}><Icon name={darkMode ? 'moon' : 'sun'} /></button>
              {themeMenuOpen && (
                <div className="theme-menu">
                  <button type="button" onClick={() => { setDarkMode(false); setThemeMenuOpen(false) }}><Icon name="sun" size={15} /> Light</button>
                  <button type="button" onClick={() => { setDarkMode(true); setThemeMenuOpen(false) }}><Icon name="moon" size={15} /> Dark</button>
                </div>
              )}
            </div>
            <button className="topbar-admin" type="button" onClick={() => onNavigate('profile')} aria-label="Open admin profile"><span className="avatar avatar-small">{initials(adminName)}</span><strong>{shortName}</strong></button>
          </div>
        </header>
        <section className="page-content">{children}</section>
      </main>
    </div>
  )
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AD'
}
