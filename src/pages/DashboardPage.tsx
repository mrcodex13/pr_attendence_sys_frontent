import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/client'
import { pad2 } from '../lib/format'
import { DonutChart, GroupBarChart, StatCard, TrendChart } from '../components/ui/Cards'
import { DeviceHealthDot } from '../components/ui/Status'
import { Icon } from '../components/Icon'
import { PermissionGate } from '../components/ui/Feedback'

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const stats = api.dashboard(user?.role === 'TEACHER' || user?.role === 'MANAGER' ? user.groupIds : undefined)
  const devices = api.devices()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateLine = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <PermissionGate permission="dashboard.view">
      <div className="dashboard-view">
        <section className="welcome-banner">
          <div>
            <span className="eyebrow">{dateLine.toUpperCase()}</span>
            <h2>
              {greeting}, {user?.name.split(' ')[0]} <span>✦</span>
            </h2>
            <p>
              {user?.role === 'TEACHER' || user?.role === 'MANAGER'
                ? 'Your classes and team, derived from today’s scans.'
                : 'Campus and office attendance from immutable scan events.'}
            </p>
          </div>
          <button className="button button-primary" type="button" onClick={() => navigate('/live')}>
            <Icon name="live" /> Open live feed <span aria-hidden="true">→</span>
          </button>
          <div className="banner-orbit orbit-one" />
          <div className="banner-orbit orbit-two" />
        </section>

        <div className="kpi-grid">
          <StatCard
            label="People in scope"
            value={pad2(stats.people)}
            foot="Active students and employees"
            icon="users"
            tone="blue"
            onClick={() => navigate('/people')}
          />
          <StatCard
            label="Present today"
            value={pad2(stats.present)}
            foot="Checked in within grace"
            icon="check"
            tone="green"
            onClick={() => navigate('/attendance?status=PRESENT')}
          />
          <StatCard
            label="Late"
            value={pad2(stats.late)}
            foot="After grace period"
            icon="clock"
            tone="amber"
            onClick={() => navigate('/attendance?status=LATE')}
          />
          <StatCard
            label="Absent"
            value={pad2(stats.absent)}
            foot="No scan and no approved leave"
            icon="alert"
            tone="red"
            onClick={() => navigate('/attendance?status=ABSENT')}
          />
          <div className="kpi-card rate-card">
            <DonutChart value={stats.rate} label="Attendance rate" />
          </div>
        </div>

        <div className="dashboard-grid dashboard-primary-grid">
          <section className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <h3>Seven-day trend</h3>
                <span>Derived records, not raw scans</span>
              </div>
            </div>
            <TrendChart series={stats.trend} />
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Group rates</h3>
                <span>Classes, teams, departments</span>
              </div>
            </div>
            <GroupBarChart rows={stats.groupRates} />
          </section>
        </div>

        <div className="dashboard-grid dashboard-secondary-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Top absentees</h3>
                <span>Last 30 days</span>
              </div>
            </div>
            {stats.topAbsentees.map((row) => (
              <div className="feed-row" key={row.name}>
                <strong>{row.name}</strong>
                <span className="muted">{row.days} days</span>
              </div>
            ))}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Device health</h3>
                <span>Heartbeat strip</span>
              </div>
              <button type="button" onClick={() => navigate('/devices')}>
                All devices <span>→</span>
              </button>
            </div>
            {devices.map((d) => (
              <div className="feed-row" key={d.id}>
                <span className="feed-copy">
                  <strong>{d.name}</strong>
                  <small>
                    Queue {d.queueDepth} · {d.firmwareVersion}
                  </small>
                </span>
                <DeviceHealthDot health={d.health} />
              </div>
            ))}
          </section>
          <section className="panel alerts-panel">
            <div className="panel-heading">
              <div>
                <h3>Exceptions</h3>
                <span>{stats.exceptions} need a human</span>
              </div>
              <button type="button" onClick={() => navigate('/exceptions')}>
                Queue <span>→</span>
              </button>
            </div>
            <p className="muted">Unknown faces, low confidence and inactive people never disappear. Open the queue to resolve them.</p>
          </section>
        </div>
      </div>
    </PermissionGate>
  )
}
