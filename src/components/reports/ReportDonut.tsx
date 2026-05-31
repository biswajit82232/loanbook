import { formatCurrency } from '../../data/helpers'
import type { ReportChartSlice } from '../../data/reports'

interface ReportDonutProps {
  title: string
  slices: ReportChartSlice[]
  size?: number
}

export function ReportDonut({ title, slices, size = 148 }: ReportDonutProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)

  if (total <= 0) {
    return (
      <div className="report-chart-card">
        <h3 className="report-chart-title">{title}</h3>
        <p className="empty-inline">No data</p>
      </div>
    )
  }

  const gradientStops = slices
    .reduce<{ stops: string[]; cursor: number }>(
      (acc, slice) => {
        const pct = (slice.value / total) * 100
        const start = acc.cursor
        const end = start + pct
        return {
          cursor: end,
          stops: [...acc.stops, `${slice.color} ${start}% ${end}%`],
        }
      },
      { stops: [], cursor: 0 },
    )
    .stops.join(', ')

  return (
    <div className="report-chart-card">
      <h3 className="report-chart-title">{title}</h3>
      <div className="report-donut-wrap">
        <div
          className="report-donut"
          style={{
            width: size,
            height: size,
            background: `conic-gradient(${gradientStops})`,
          }}
          role="img"
          aria-label={`${title}: ${slices.map((s) => `${s.label} ${formatCurrency(s.value)}`).join(', ')}`}
        />
        <div className="report-donut-hole" style={{ width: size * 0.55, height: size * 0.55 }}>
          <span className="report-donut-total">{formatCurrency(total)}</span>
        </div>
      </div>
      <ul className="report-legend">
        {slices.map((slice) => {
          const pct = Math.round((slice.value / total) * 100)
          return (
            <li key={slice.id}>
              <span className="report-legend-dot" style={{ background: slice.color }} />
              <span className="report-legend-label">{slice.label}</span>
              <span className="report-legend-value">{formatCurrency(slice.value)}</span>
              <span className="report-legend-pct">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
