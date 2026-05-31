export function toInputDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function toInputDateFromDisplay(display: string): string {
  const d = new Date(display)
  if (Number.isNaN(d.getTime())) return toInputDate(new Date())
  return toInputDate(d)
}

/** Parse YYYY-MM-DD from date input in local calendar (no UTC shift). */
export function parseInputDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const date = new Date(y, mo, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo || date.getDate() !== d) return null
  return date
}

export function formatDisplayDateFromInput(iso: string): string {
  const d = parseInputDate(iso)
  if (!d) return iso
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
