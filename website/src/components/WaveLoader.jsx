import { StarWavesLogo } from './StarWavesLogo'

export function WaveLoader({ label = 'Loading StarWaves…', detail = 'Preparing your workspace' }) {
  return (
    <div className="wave-loader" role="status" aria-live="polite">
      <div className="wave-loader-ambient" aria-hidden="true" />
      <div className="wave-loader-card">
        <div className="wave-loader-brand">
          <div className="wave-loader-logo-ring">
            <StarWavesLogo size={52} />
            <span className="wave-loader-orbit" aria-hidden="true">
              <span className="wave-loader-orbit-dot" />
            </span>
          </div>
          <div className="wave-loader-heading">
            <div className="wave-loader-title">StarWaves</div>
            <p className="wave-loader-subtitle">{detail}</p>
          </div>
        </div>
        <div className="wave-loader-wave" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="wave-loader-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100}>
          <div className="wave-loader-progress-bar" />
        </div>
        <span className="wave-loader-label">{label}</span>
      </div>
    </div>
  )
}
