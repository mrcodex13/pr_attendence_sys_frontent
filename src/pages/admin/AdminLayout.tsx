import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export function AdminLayout() {
  const { can } = useAuth()
  const links = [
    can('users.manage') ? { to: '/admin/users', label: 'Users' } : null,
    can('settings.manage') ? { to: '/admin/settings', label: 'Settings' } : null,
    can('audit.view') ? { to: '/admin/audit', label: 'Audit' } : null,
    can('privacy.manage') ? { to: '/admin/privacy', label: 'Privacy' } : null,
  ].filter(Boolean) as { to: string; label: string }[]

  return (
    <div className="view-stack">
      <nav className="subnav" aria-label="Administration">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
