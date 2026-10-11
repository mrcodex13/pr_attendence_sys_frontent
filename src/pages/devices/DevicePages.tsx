import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { DeviceCard } from '../../components/ui/Cards'
import { DeviceHealthDot, StatusBadge } from '../../components/ui/Status'
import { EmptyState, PermissionGate } from '../../components/ui/Feedback'
import { KeyRevealModal, PageHeader, Stepper } from '../../components/ui/Workflow'
import { SelectField, TextField } from '../../components/ui/Forms'
import { formatDateTime, relativeTime } from '../../lib/format'

export function DevicesPage() {
  const devices = api.devices()
  const navigate = useNavigate()
  return (
    <PermissionGate permission="devices.manage">
      <div className="view-stack">
        <PageHeader
          title="Devices"
          subtitle="Health, last seen, queue depth, firmware."
          actions={
            <Link className="button button-primary" to="/devices/register">
              Register device
            </Link>
          }
        />
        {devices.length === 0 ? (
          <EmptyState title="No devices" hint="Register an AMB82-Mini to start scanning." />
        ) : (
          <div className="device-grid">
            {devices.map((d) => (
              <DeviceCard key={d.id} device={d} onOpen={() => navigate(`/devices/${d.id}`)} />
            ))}
          </div>
        )}
      </div>
    </PermissionGate>
  )
}

export function DeviceDetailPage() {
  const { id } = useParams()
  const [, bump] = useState(0)
  const device = id ? api.device(id) : undefined
  const scans = api.scans().filter((s) => s.deviceId === id)
  const enrollments = api.enrollments().filter((e) => e.deviceId === id)
  const people = api.people()
  const settings = api.settings()

  if (!device) return <EmptyState title="Device not found" />

  return (
    <PermissionGate permission="devices.manage">
      <div className="view-stack">
        <PageHeader
          title={device.name}
          subtitle={`${device.deviceCode} · ${device.location} · direction ${device.direction}`}
          actions={<DeviceHealthDot health={device.health} />}
        />
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-label">Last seen</span>
            <strong className="kpi-value">{device.lastSeenAt ? relativeTime(device.lastSeenAt) : 'Never'}</strong>
            <span className="kpi-foot">{device.lastSeenAt ? formatDateTime(device.lastSeenAt) : 'No authenticated heartbeat yet'}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Queue depth</span>
            <strong className="kpi-value">{device.queueDepth}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Wi-Fi RSSI</span>
            <strong className="kpi-value">{device.wifiRssi}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Firmware</span>
            <strong className="kpi-value" style={{ fontSize: 18 }}>
              {device.firmwareVersion}
            </strong>
          </div>
        </div>
        <section className="panel">
          <h3>Config</h3>
          <p className="muted">
            minConfidence {settings.minConfidence} · debounce {settings.debounceSeconds}s · timezone {settings.timezone}
          </p>
          <div className="toolbar-actions">
            <button className="button button-secondary" type="button">
              Reboot
            </button>
            <button className="button button-secondary" type="button">
              Fetch config
            </button>
            {device.health !== 'ONLINE' && (
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  api.simulateAuthenticatedHeartbeat(device.id, 'Current user')
                  bump((n) => n + 1)
                }}
              >
                Simulate heartbeat (demo)
              </button>
            )}
          </div>
        </section>
        <section className="panel">
          <h3>Recent scans</h3>
          {scans.slice(0, 8).map((s) => (
            <div className="feed-row" key={s.eventId}>
              <span className="feed-copy">
                <strong>{s.displayName}</strong>
                <small>{s.eventId}</small>
              </span>
              <StatusBadge value={s.result} />
            </div>
          ))}
        </section>
        <section className="panel">
          <h3>Enrolments</h3>
          {enrollments.map((e) => (
            <div className="feed-row" key={e.id}>
              <span>{people.find((p) => p.id === e.personId)?.name}</span>
              <StatusBadge value={e.status} />
            </div>
          ))}
        </section>
      </div>
    </PermissionGate>
  )
}

export function RegisterDevicePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('LAB-01')
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [heartbeatVerified, setHeartbeatVerified] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const result = api.registerDevice({
      deviceCode: String(form.get('deviceCode')),
      name: String(form.get('name')),
      location: String(form.get('location')),
      direction: String(form.get('direction')) as 'IN' | 'OUT' | 'EITHER',
    })
    setCode(result.device.deviceCode)
    setDeviceId(result.device.id)
    setSecret(result.secret)
    setStep(1)
  }

  return (
    <PermissionGate permission="devices.manage">
      <div className="view-stack register-device-page">
        <PageHeader title="Register device" subtitle="The secret is shown once. Put it on the AMB82-Mini during provisioning." />
        <Stepper steps={['Details', 'Secret', 'Heartbeat']} current={step} />
        {step === 0 && (
          <form className="panel form-grid" onSubmit={submit}>
            <TextField name="deviceCode" label="Device code" defaultValue="LAB-01" required />
            <TextField name="name" label="Name" defaultValue="Lab camera" required />
            <TextField name="location" label="Room / location" defaultValue="Lab-2" required />
            <SelectField name="direction" label="Direction" defaultValue="IN">
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="EITHER">EITHER</option>
            </SelectField>
            <button className="button button-primary" type="submit">
              Create device
            </button>
          </form>
        )}
        {step === 2 && !heartbeatVerified && deviceId && (
          <section className="panel">
            <h3>Verify the first authenticated heartbeat</h3>
            <p className="muted">On the AMB82-Mini:</p>
            <ol>
              <li>Flash the attendance firmware and connect the device to its approved network.</li>
              <li>Enter the server endpoint, device code <strong>{code}</strong>, and the one-time secret.</li>
              <li>Confirm the device reports an authenticated heartbeat before finishing registration.</li>
            </ol>
            <p className="muted">
              This frontend is using demo data. The button simulates a successful heartbeat; it does not contact real hardware.
            </p>
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                api.simulateAuthenticatedHeartbeat(deviceId, user?.name ?? 'Current user')
                setHeartbeatVerified(true)
              }}
            >
              Simulate authenticated heartbeat
            </button>
          </section>
        )}
        {step === 2 && heartbeatVerified && (
          <section className="panel">
            <h3>First heartbeat verified</h3>
            <p className="muted">{code} is online and its authenticated heartbeat is recorded in the audit log.</p>
            <button className="button button-primary" type="button" onClick={() => navigate('/devices')}>
              Open device list
            </button>
          </section>
        )}
      </div>
      {secret && (
        <KeyRevealModal
          secret={secret}
          onClose={() => {
            setSecret(null)
            setStep(2)
          }}
        />
      )}
    </PermissionGate>
  )
}
