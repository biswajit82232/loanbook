import { useId, useState, type ReactNode } from 'react'
import { Icon } from './icons'

interface SettingsCollapsibleProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

export function SettingsCollapsible({
  title,
  children,
  defaultOpen = false,
}: SettingsCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <section className={`settings-section settings-collapsible${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="settings-collapsible-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="settings-section-title">{title}</span>
        <Icon
          name="chevron-right"
          size={20}
          className="settings-collapsible-chevron"
          aria-hidden
        />
      </button>
      <div id={panelId} className="settings-collapsible-panel" hidden={!open}>
        {children}
      </div>
    </section>
  )
}
