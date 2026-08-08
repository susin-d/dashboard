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
        </div>
        <span className="wave-loader-label">{label}</span>
      </div>
    </div>
  )
}
