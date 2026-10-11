import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { LiveScanCard } from '../components/ui/Cards'
import { DeviceHealthDot } from '../components/ui/Status'
import { EmptyState, PermissionGate } from '../components/ui/Feedback'
import { PageHeader } from '../components/ui/Workflow'
import type { ScanEvent } from '../types/domain'

export function LiveFeedPage() {
  const [scans, setScans] = useState<ScanEvent[]>(() => api.scans())
  const devices = api.devices()

  useEffect(() => {
    const timer = window.setInterval(() => {
      api.ingestLiveScan()
      setScans([...api.scans()])
    }, 8000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <PermissionGate permission="live.view">
      <div className="view-stack live-feed-page">
        <PageHeader title="Live feed" subtitle="New scans arrive without refresh. Photos stay on the device unless an admin uploaded a profile picture." />
        <div className="device-strip">
          {devices.map((d) => (
            <div className="device-strip-item" key={d.id}>
              <strong>{d.name}</strong>
              <DeviceHealthDot health={d.health} />
            </div>
          ))}
        </div>
        {scans.length === 0 ? (
          <EmptyState title="No scans yet" hint="Stand in front of an enrolled AMB82-Mini, or wait for the demo pulse." />
        ) : (
          <div className="live-grid">
            {scans.map((scan) => (
              <LiveScanCard key={scan.eventId} scan={scan} />
            ))}
          </div>
        )}
      </div>
    </PermissionGate>
  )
}
