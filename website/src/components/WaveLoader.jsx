import { StarWavesLogo } from './StarWavesLogo'

export function WaveLoader({ label = 'Loading StarWaves…' }) {
  return (
    <div className="wave-loader" role="status" aria-live="polite">
      <div className="wave-loader-inner">
        <StarWavesLogo size={64} />
        <div className="wave-loader-title">StarWaves</div>
        <div className="wave-loader-waves" aria-hidden="true">
          <span className="wave-line wave-line-back" />
          <span className="wave-line wave-line-mid" />
          <span className="wave-line wave-line-front" />
          <span className="wave-line wave-line-foam">
            <span className="wave-foam" />
            <span className="wave-foam wave-foam-2" />
            <span className="wave-foam wave-foam-3" />
          </span>
        </div>
        <span className="wave-loader-label">{label}</span>
      </div>
    </div>
  )
}
