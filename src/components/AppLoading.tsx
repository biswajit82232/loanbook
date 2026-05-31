import { BRAND_ICON_192 } from '../constants/brand'
import { clampLoadPercent } from '../data/load-progress'

interface AppLoadingProps {
  label?: string
  percent?: number
}

export function AppLoading({
  label = 'Loading LoanBook…',
  percent,
}: AppLoadingProps) {
  const hasProgress = percent !== undefined
  const pct = hasProgress ? clampLoadPercent(percent) : 0

  return (
    <div className="app-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="app-loading-inner">
        <div className="app-loading-brand-block">
          <img
            className="app-loading-logo"
            src={BRAND_ICON_192}
            width={56}
            height={56}
            alt=""
            aria-hidden
          />
          <p className="app-loading-brand">LoanBook</p>
        </div>

        {hasProgress ? (
          <div
            className="app-loading-progress"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
          >
            <div className="app-loading-progress-track">
              <div
                className="app-loading-progress-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="app-loading-progress-meta">
              <span className="app-loading-percent">{pct}%</span>
              <span className="app-loading-step">{label}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="app-loading-spinner" aria-hidden />
            <p className="app-loading-label">{label}</p>
          </>
        )}
      </div>
    </div>
  )
}
