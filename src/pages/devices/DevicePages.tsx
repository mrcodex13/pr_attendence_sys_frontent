import { useParams } from 'react-router-dom'
import { EmptyState, PermissionGate } from '../../components/ui/Feedback'
import { PageHeader } from '../../components/ui/Workflow'

function DeviceProtocolNotice({ deviceId }: { deviceId?: string }) {
  return (
    <PermissionGate permission="devices.manage">
      <div className="view-stack">
        <PageHeader
          title={deviceId ? 'Device integration pending' : 'Device integration'}
          subtitle="Backend device APIs are ready; AMB82-Mini firmware still needs to be connected and verified."
        />
        <section className="panel">
          <h3>{deviceId ? `Device ${deviceId}` : 'No device registration available'}</h3>
          <p className="muted">
            Device provisioning, signed heartbeats, scan ingestion, and acknowledged enrollment commands are available through the backend API.
            This screen does not yet expose device controls; register a device through the API and verify the firmware protocol on the AMB82-Mini.
          </p>
        </section>
      </div>
    </PermissionGate>
  )
}

export function DevicesPage() {
  return <DeviceProtocolNotice />
}

export function DeviceDetailPage() {
  const { id } = useParams()
  return id ? <DeviceProtocolNotice deviceId={id} /> : <EmptyState title="Device not found" />
}

export function RegisterDevicePage() {
  return <DeviceProtocolNotice />
}
