interface DateFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
}

export function DateField({ label, value, onChange, required, disabled }: DateFieldProps) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="field-required"> *</span>}
      </span>
      <input
        type="date"
        className="date-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
      />
    </label>
  )
}
