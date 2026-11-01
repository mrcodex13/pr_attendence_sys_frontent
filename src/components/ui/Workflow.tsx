import { useState, type ReactNode } from 'react'
import { RECORD_STATUSES, type Person, type RecordStatus } from '../../types/domain'

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="stepper">
      {steps.map((step, i) => (
        <li key={step} className={i === current ? 'active' : i < current ? 'done' : ''}>
          <span>{i + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  )
}

export function EnrollmentProgress({ phase }: { phase: 'idle' | 'capture' | 'success' | 'fail' }) {
  const copy = {
    idle: 'Waiting for the device…',
    capture: 'Hold still. Capturing several angles.',
    success: 'Face enrolled on this device.',
    fail: 'Enrolment failed. Retry in better light.',
  }
  return (
    <div className={`enroll-progress enroll-${phase}`}>
      <div className="enroll-ring" />
      <strong>{copy[phase]}</strong>
    </div>
  )
}

export function KeyRevealModal({
  secret,
  onClose,
}: {
  secret: string
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="secret-title">
      <div className="modal-card">
        <h2 id="secret-title">Device secret — shown once</h2>
        <p className="muted">Copy this into the AMB82-Mini provisioner. It cannot be retrieved later; rotate if lost.</p>
        <code className="secret-box">{secret}</code>
        <div className="toolbar-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={() => navigator.clipboard.writeText(secret)}
          >
            Copy
          </button>
          <button className="button button-secondary" type="button" onClick={onClose}>
            I have saved it
          </button>
        </div>
      </div>
    </div>
  )
}

export function CorrectionDialog({
  current,
  onCancel,
  onConfirm,
}: {
  current: RecordStatus
  onCancel: () => void
  onConfirm: (status: RecordStatus, reason: string) => void
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form
        className="modal-card"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          const status = data.get('status') as RecordStatus
          const reason = String(data.get('reason') ?? '').trim()
          if (!reason) return
          onConfirm(status, reason)
        }}
      >
        <h2>Correct attendance</h2>
        <p className="muted">Every correction is written to the audit log with your name and reason.</p>
        <label className="form-field">
          <span>New status</span>
          <select name="status" defaultValue={current}>
            {RECORD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Reason (required)</span>
          <input name="reason" required placeholder="Why is this being changed?" />
        </label>
        <div className="toolbar-actions">
          <button className="button button-primary" type="submit">
            Save correction
          </button>
          <button className="button button-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export function ManualAttendanceDialog({
  people,
  busy,
  onCancel,
  onConfirm,
}: {
  people: Person[]
  busy: boolean
  onCancel: () => void
  onConfirm: (personId: string, status: RecordStatus, reason: string) => void
}) {
  const [error, setError] = useState('')
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="manual-attendance-title">
      <form
        className="modal-card"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const reason = String(data.get('reason') ?? '').trim()
          if (reason.length < 3) {
            setError('Enter a reason of at least 3 characters.')
            return
          }
          onConfirm(String(data.get('personId') ?? ''), data.get('status') as RecordStatus, reason)
        }}
      >
        <h2 id="manual-attendance-title">Record attendance manually</h2>
        <p className="muted">This adds a record for today. Your reason and account are saved in the audit log.</p>
        <label className="form-field">
          <span>Person</span>
          <select name="personId" required defaultValue="">
            <option value="" disabled>Select a person</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.personCode}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Status</span>
          <select name="status" defaultValue="PRESENT">
            {RECORD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Reason (required)</span>
          <textarea name="reason" rows={3} minLength={3} maxLength={500} required />
          {error && <small className="field-error" role="alert">{error}</small>}
        </label>
        <div className="toolbar-actions">
          <button className="button button-primary" type="submit" disabled={busy || people.length === 0}>
            {busy ? 'Saving…' : 'Save manual attendance'}
          </button>
          <button className="button button-secondary" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export function ExceptionResolutionDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const [error, setError] = useState('')

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="exception-resolution-title">
      <form
        className="modal-card"
        onSubmit={(event) => {
          event.preventDefault()
          const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim()
          if (!reason) {
            setError('Enter a resolution note before continuing.')
            return
          }
          onConfirm(reason)
        }}
      >
        <h2 id="exception-resolution-title">Resolve scan exception</h2>
        <p className="muted">
          The original scan event will be preserved. Record what you verified; the resolution is added to the audit log.
        </p>
        <label className="form-field">
          <span>Resolution note (required)</span>
          <textarea name="reason" rows={4} required aria-describedby={error ? 'exception-resolution-error' : undefined} />
          {error && <small className="field-error" id="exception-resolution-error">{error}</small>}
        </label>
        <div className="toolbar-actions">
          <button className="button button-primary" type="submit">
            Resolve exception
          </button>
          <button className="button button-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export function ConfirmDialog({
  title,
  body,
  onCancel,
  onConfirm,
}: {
  title: string
  body: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="toolbar-actions">
          <button className="button button-primary" type="button" onClick={onConfirm}>
            Confirm
          </button>
          <button className="button button-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="toolbar-actions">{actions}</div>}
    </header>
  )
}
