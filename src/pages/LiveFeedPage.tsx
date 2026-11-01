import { useEffect, useState } from 'react'
import { connectLiveFeed } from '../api/client'
import { LiveScanCard } from '../components/ui/Cards'
import { EmptyState, PermissionGate } from '../components/ui/Feedback'
import { PageHeader } from '../components/ui/Workflow'
import type { ScanEvent } from '../types/domain'

export function LiveFeedPage() {
  const [scans, setScans] = useState<ScanEvent[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    return connectLiveFeed(
      (scan) => setScans((current) => [scan, ...current.filter((item) => item.eventId !== scan.eventId)].slice(0, 50)),
      (err) => setError(err.message),
    )
  }, [])

  return (
    <PermissionGate permission="live.view">
      <div className="view-stack live-feed-page">
        <PageHeader title="Live feed" subtitle="Attendance check-ins from camera recognition and registered devices, live." />
        {error && <p className="field-error" role="alert">{error}</p>}
        {scans.length === 0 ? (
          <EmptyState title="No attendance events yet" hint="Camera-recognized check-ins and registered-device scans will appear here as they are recorded." />
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
