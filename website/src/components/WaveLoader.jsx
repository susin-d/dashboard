import { StarWavesLogo } from './StarWavesLogo'

export function WaveLoader({ label = 'Loading StarWaves…', detail = 'Preparing your workspace' }) {
  return (
    <div className="wave-loader" role="status" aria-live="polite">
      <div className="wave-loader-backdrop" aria-hidden="true">
        <div className="wave-loader-grid" />
        <div className="wave-loader-glow wave-loader-glow--primary" />
        <div className="wave-loader-glow wave-loader-glow--eve" />
      </div>
      <div className="wave-loader-card">
        <div className="wave-loader-top" aria-hidden="true">
          <span className="wave-loader-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="wave-loader-top-label">starwaves</span>
          <span className="wave-loader-live">● loading</span>
        </div>
        <div className="wave-loader-body">
          <div className="wave-loader-brand">
            <div className="wave-loader-logo-ring">
              <StarWavesLogo size={52} />
            </div>
            <div className="wave-loader-heading">
              <p className="wave-loader-eyebrow">Code • Create • Evolve</p>
              <div className="wave-loader-title">
                Star<span className="wave-loader-title-accent">Waves</span>
              </div>
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
    </div>
  )
}
