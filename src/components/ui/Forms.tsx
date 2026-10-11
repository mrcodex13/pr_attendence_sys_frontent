import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function TextField({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input {...props} />
      {error && <small className="field-error">{error}</small>}
    </label>
  )
}

export function SelectField({
  label,
  children,
  error,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode; error?: string }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select {...props}>{children}</select>
      {error && <small className="field-error">{error}</small>}
    </label>
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
    <label className="consent-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        I confirm this person (or their guardian) consented to on-device face enrolment. Face templates stay on the
        AMB82-Mini. Photos are optional and stored only if uploaded here.
      </span>
    </label>
  )
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}
