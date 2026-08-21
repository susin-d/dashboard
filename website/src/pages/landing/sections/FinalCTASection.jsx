import { ArrowRight } from 'lucide-react'

export function FinalCTASection({ user, onNavigate }) {
  return (
    <section className="cinematic-final-cta">
      <div className="final-cta-spotlight" aria-hidden="true" />
      <div className="final-cta-inner scroll-reveal">
        <p className="section-eyebrow">Ready when you are</p>
        <h2>Build a workspace that moves with your ambition.</h2>
        <p className="final-cta-sub">Join developers, competitive coders and builders organizing their daily progress on StarWaves. Free to start, monochrome by conviction.</p>
        <div className="final-cta-buttons">
          {user ? (
            <button className="cta-primary cta-hero" onClick={() => onNavigate('/app/dashboard')}>Go to Dashboard <ArrowRight size={18} aria-hidden="true" /></button>
          ) : (
            <>
              <button className="cta-primary cta-hero" onClick={() => onNavigate('/signup')}>Create your account <ArrowRight size={18} aria-hidden="true" /></button>
              <button className="cta-ghost" onClick={() => onNavigate('/login')}>Log in to workspace</button>
            </>
          )}
        </div>
        <p className="final-cta-micro">No credit card required • Cancel anytime • Your data stays yours</p>
      </div>
    </section>
  )
}
