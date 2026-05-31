export interface LoadProgressUpdate {
  percent: number
  label: string
}

export function clampLoadPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

export type LoadProgressReporter = (update: LoadProgressUpdate) => void
