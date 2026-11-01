import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/client'
import { DonutChart, GroupBarChart, StatCard, TrendChart } from '../components/ui/Cards'
import { Icon } from '../components/Icon'
import { ErrorState, PermissionGate } from '../components/ui/Feedback'
import type { DashboardStats } from '../types/domain'

function DashboardEmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon: string
  title: string
  detail: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="dashboard-empty">
      <span className="dashboard-empty-icon"><Icon name={icon} size={19} /></span>
      <strong>{title}</strong>
      <p>{detail}</p>
      {action && <button className="button button-secondary button-sm" type="button" onClick={action.onClick}>{action.label}</button>}
    </div>
  )
}

const EMPTY_STATS: DashboardStats = {
  present: 0,
  late: 0,
  absent: 0,
  excused: 0,
  people: 0,
  exceptions: 0,
  rate: 0,
  trend: [],
  groupRates: [],
  topAbsentees: [],
}

export function DashboardPage() {
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(EMPTY_STATS)
  const [error, setError] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  useEffect(() => {
    let active = true
    let hasLoadedData = false
    async function refreshDashboard() {
      try {
        const result = await api.dashboard()
        if (!active) return
        setStats(result)
        setError('')
        setRefreshError('')
        hasLoadedData = true
      } catch (err: unknown) {
        if (!active) return
        const message = err instanceof Error ? err.message : 'Could not load dashboard data.'
        if (hasLoadedData) setRefreshError(message)
        else setError(message)
      } finally {
        if (active) setLoading(false)
      }
    }
    void refreshDashboard()
    const timer = window.setInterval(() => void refreshDashboard(), 30_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [retryCount])
  const notScanned = Math.max(0, stats.notScanned ?? stats.people - stats.present - stats.late - stats.absent - stats.excused)

  return (
    <PermissionGate permission="dashboard.view">
      <div className="dashboard-view">
        {error && (
          <ErrorState
            message={error}
            onRetry={() => {
              setError('')
              setLoading(true)
              setRetryCount((count) => count + 1)
            }}
          />
        )}
        {loading && <p className="muted" role="status">Loading dashboard…</p>}
        {refreshError && !error && (
          <p className="dashboard-refresh-note" role="status">
            Could not refresh the latest data. Showing the last loaded dashboard. {refreshError}
          </p>
        )}
        {!loading && !error && (
          <>
        <div className="dashboard-content">
        <section className="welcome-banner">
          <div className="welcome-copy">
            <h2>
              Welcome back, {user?.name.split(' ')[0]}
            </h2>
            <p>
              {user?.role === 'TEACHER' || user?.role === 'MANAGER'
                ? `${(stats.present + stats.late).toLocaleString()} of ${stats.people.toLocaleString()} people in your groups checked in. ${notScanned.toLocaleString()} haven't scanned yet.`
                : `${(stats.present + stats.late).toLocaleString()} of ${stats.people.toLocaleString()} people checked in. ${notScanned.toLocaleString()} haven't scanned yet.`}
            </p>
          </div>
          <div className="welcome-actions">
            {can('attendance.view') && <button className="button button-primary" type="button" onClick={() => navigate('/camera')}><Icon name="camera" /> Take camera attendance</button>}
            {can('live.view') && <button className="button button-secondary welcome-live-button" type="button" onClick={() => navigate('/live')}><Icon name="live" /> Live feed</button>}
          </div>
        </section>

        <div className="kpi-grid">
          <StatCard
            label="People in scope"
            value={stats.people.toLocaleString()}
            foot="Active students and employees"
            icon="users"
            tone="blue"
            onClick={() => navigate('/people')}
          />
          <StatCard
            label="Present today"
            value={stats.present.toLocaleString()}
            foot="Checked in within grace"
            icon="check"
            tone="green"
            onClick={() => navigate('/attendance?status=PRESENT')}
          />
          <StatCard
            label="Late"
            value={stats.late.toLocaleString()}
            foot={stats.late > 0 ? 'After grace period' : 'No late arrivals'}
            icon="clock"
            tone="amber"
            onClick={() => navigate('/attendance?status=LATE')}
          />
          <StatCard
            label="Absent"
            value={stats.absent.toLocaleString()}
            foot={stats.absent > 0 ? 'No scan and no approved leave' : 'No absences recorded'}
            icon="alert"
            tone="red"
            onClick={() => navigate('/attendance?status=ABSENT')}
          />
          <div className="kpi-card kpi-rate-card">
            <DonutChart
              value={stats.rate}
              label="Attendance rate"
              attended={stats.present + stats.late}
              people={stats.people}
              notScanned={notScanned}
            />
          </div>
        </div>

        <div className="dashboard-grid dashboard-primary-grid">
          <section className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <h3>Seven-day trend</h3>
                <span>Share of active people present or late per day · today is still updating</span>
              </div>
            </div>
            <TrendChart series={stats.trend} people={stats.people} today={stats.date} />
          </section>
          <section className="panel group-rates-panel">
            <div className="panel-heading">
              <div>
                <h3>Group rates</h3>
                <span>Today · present or late by group</span>
              </div>
            </div>
            <GroupBarChart rows={stats.groupRates} />
            <div className="dashboard-card-footer">
              <span>Rates reflect active people assigned to each group. Add clear names to identify groups.</span>
              {can('groups.manage') && <button type="button" onClick={() => navigate('/organization/groups')}>Rename groups</button>}
            </div>
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
            {stats.topAbsentees.length === 0 ? (
              <DashboardEmptyState
                icon="check"
                title="No recurring absences"
                detail="People with repeated absences will appear here."
                action={{ label: 'View attendance', onClick: () => navigate('/attendance') }}
              />
            ) : stats.topAbsentees.map((row) => (
                <div className="feed-row" key={row.name}>
                  <strong>{row.name}</strong>
                  <span className="muted">{row.days} days</span>
                </div>
              ))}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Devices</h3>
                <span>Setup and availability</span>
              </div>
              <button type="button" onClick={() => navigate('/devices')}>
                View devices
              </button>
            </div>
            <DashboardEmptyState
              icon="device"
              title="Manage registered devices"
              detail="Review device setup in Devices. Camera attendance is ready to use."
              action={{ label: 'Open camera attendance', onClick: () => navigate('/camera') }}
            />
          </section>
          <section className="panel alerts-panel">
            <div className="panel-heading">
              <div>
                <h3>Scan exceptions</h3>
                <span>{stats.exceptions} open items</span>
              </div>
              <button type="button" onClick={() => navigate('/exceptions')}>
                Review exceptions
              </button>
            </div>
            {stats.exceptions > 0 ? (
              <DashboardEmptyState
                icon="alert"
                title={`${stats.exceptions} items need review`}
                detail="Unknown scans and low-confidence matches appear here for review."
                action={{ label: 'Open exception queue', onClick: () => navigate('/exceptions') }}
              />
            ) : (
              <DashboardEmptyState icon="check" title="All clear" detail="There are no unresolved scan exceptions." />
            )}
          </section>
        </div>
        </div>
          </>
        )}
      </div>
    </PermissionGate>
  )
}
