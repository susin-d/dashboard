import { ArrowRight } from 'lucide-react'
import { StarWavesLogo } from '../../../components/StarWavesLogo'

export function LandingNav({ user, onNavigate }) {
  return (
    <nav className="public-nav landing-nav" aria-label="Public navigation">
      <button className="public-brand" onClick={() => onNavigate('/')} aria-label="StarWaves home">
        <StarWavesLogo size={28} /> StarWaves
      </button>
      <div className="landing-nav-links" aria-hidden="true">
        <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }}>Features</a>
        <a href="#eve" onClick={(e) => { e.preventDefault(); document.getElementById('eve')?.scrollIntoView({ behavior: 'smooth' }) }}>Eve AI</a>
        <a href="#workflow" onClick={(e) => { e.preventDefault(); document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' }) }}>Workflow</a>
        <a href="#faq" onClick={(e) => { e.preventDefault(); document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }) }}>FAQ</a>
      </div>
      <div className="public-nav-actions">
        {user ? (
          <button className="public-nav-cta" onClick={() => onNavigate('/app/dashboard')}>
            Dashboard <ArrowRight size={14} aria-hidden="true" />
          </button>
        ) : (
          <>
            <button className="public-login-link" onClick={() => onNavigate('/login')}>
              Log in
            </button>
            <button className="public-nav-cta" onClick={() => onNavigate('/signup')}>
              Get started <ArrowRight size={14} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
