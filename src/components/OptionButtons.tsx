export interface OptionItem<T extends string> {
  value: T
  label: string
}

interface OptionButtonsProps<T extends string> {
  label?: string
  value: T
  options: OptionItem<T>[]
  onChange: (value: T) => void
  disabled?: boolean
}

export function OptionButtons<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: OptionButtonsProps<T>) {
  return (
    <div className="field">
      {label && <span className="field-label">{label}</span>}
      <div className="option-buttons" role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`option-btn ${value === opt.value ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            aria-pressed={value === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
