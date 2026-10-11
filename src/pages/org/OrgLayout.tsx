import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/organization/groups', label: 'Groups' },
  { to: '/organization/timetable', label: 'Timetable' },
  { to: '/organization/shifts', label: 'Shifts' },
  { to: '/organization/holidays', label: 'Holidays' },
]

export function OrgLayout() {
  return (
    <div className="view-stack">
      <nav className="subnav" aria-label="Organization">
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
