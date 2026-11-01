import type { CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function TextField({
  label,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; className?: string }) {
  return (
    <label className={`form-field ${className}`}>
      <span>{label}</span>
      <input {...props} />
      {error && <small className="field-error">{error}</small>}
    </label>
  )
}

export function TextAreaField({
  label,
  error,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; className?: string }) {
  return (
    <label className={`form-field full-width ${className}`}>
      <span>{label}</span>
      <textarea {...props} />
      {error && <small className="field-error">{error}</small>}
    </label>
  )
}

export function SelectField({
  label,
  children,
  error,
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode; error?: string; className?: string }) {
  return (
    <label className={`form-field ${className}`}>
      <span>{label}</span>
      <select {...props}>{children}</select>
      {error && <small className="field-error">{error}</small>}
    </label>
  )
}

export function FormActions({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={`form-actions ${className}`} style={style}>
      {children}
    </div>
  )
}

export function ConsentCheckbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="consent-row full-width">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        Optional: I confirm this person (or their guardian) consented to AMB82-Mini face enrolment. Laptop-camera
        enrollment requires separate consent before encrypted face descriptors are stored by the organization.
      </span>
    </label>
  )
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="form-section full-width">
      <h3>{title}</h3>
      {children}
    </section>
  )
}
