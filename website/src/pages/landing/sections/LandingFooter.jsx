import { StarWavesLogo } from '../../../components/StarWavesLogo'

export function LandingFooter({ onNavigate }) {
  return (
    <footer className="public-footer landing-footer">
      <div className="footer-brand"><StarWavesLogo size={22} /><span>StarWaves</span></div>
      <div className="footer-links">
        <button onClick={() => onNavigate('/privacy')}>Privacy Policy</button>
        <span aria-hidden="true">•</span>
        <button onClick={() => onNavigate('/terms')}>Terms of Service</button>
      </div>
      <small>© 2026 StarWaves. All rights reserved.</small>
    </footer>
  )
}
