import { ArrowLeft } from 'lucide-react'
import { StarWavesLogo } from '../StarWavesLogo'

export function AuthShell({ backLabel, onBack, onHome, children }) {
  return (
    <main id="main-content" className="auth-cinematic" tabIndex={-1}>
      <div className="auth-cinematic__bg" aria-hidden="true" />
      <div className="auth-cinematic__card">
        <div className="auth-cinematic__top">
          <button type="button" className="auth-back" onClick={onBack}>
            <ArrowLeft size={16} /> {backLabel}
          </button>
          <button type="button" className="auth-cinematic__brand" onClick={onHome} aria-label="StarWaves home">
            <StarWavesLogo size={22} />
            <span>StarWaves</span>
          </button>
        </div>
        {children}
      </div>
      <p className="auth-cinematic__foot">Plan clearly. Build consistently.</p>
    </main>
  )
}
