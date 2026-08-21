import { ArrowRight, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react'
import { StarFieldCanvas } from '../StarFieldCanvas'
import { proofItems } from '../constants'

export function HeroSection({ onNavigate, onSeeAction }) {
  return (
    <section className="cinematic-hero landing-hero">
      <StarFieldCanvas />
      <div className="hero-grid-overlay" aria-hidden="true" />
      <div className="cinematic-hero-content">
        <div className="hero-eyebrow hero-enter hero-enter-d1">
          <Sparkles size={13} aria-hidden="true" />
          <span>One workspace. Every ambition.</span>
          <span className="hero-eyebrow-dot" aria-hidden="true" />
          <span className="hero-eyebrow-muted">Monochrome · Focused · Yours</span>
        </div>
        <h1 className="hero-headline hero-enter hero-enter-d2">
          Your work and growth,
          <br />
          <span className="hero-headline-accent">finally in sync.</span>
        </h1>
        <p className="hero-subtitle hero-enter hero-enter-d3">
          StarWaves brings tasks, calendars, coding contests, hackathons, projects, job applications,
          documents, mail, chats and <strong>Eve AI</strong> into one calm monochrome workspace —
          so you stay organized without switching tools.
        </p>
        <div className="hero-cta-group hero-enter hero-enter-d4">
          <button className="cta-primary cta-hero" onClick={() => onNavigate('/signup')}>
            Start your journey <ArrowRight size={17} aria-hidden="true" />
          </button>
          <button className="cta-ghost" onClick={onSeeAction}>
            See it in action <ChevronDown size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="hero-proof-row hero-enter hero-enter-d5" aria-label="Key capabilities">
          {proofItems.map((label) => (
            <span key={label}>
              <CheckCircle2 size={14} aria-hidden="true" /> {label}
            </span>
          ))}
        </div>

        <div className="hero-preview-wrap hero-enter hero-enter-d5" aria-hidden="true">
          <div className="hero-preview-glow" />
          <div className="hero-preview-card">
            <div className="hero-preview-top">
              <div className="hero-preview-dots"><i /><i /><i /></div>
              <span>starwaves.app — Dashboard • Today</span>
              <span className="hero-preview-live">● Live sync</span>
            </div>
            <div className="hero-preview-body">
              <div className="hero-preview-kpi">
                <div><small>Tasks today</small><strong>5 active</strong><span>2 completed</span></div>
                <div><small>Next contest</small><strong>Codeforces Rd #982</strong><span>Tomorrow 14:35 UTC</span></div>
                <div><small>Job pipeline</small><strong>3 interviewing</strong><span>1 offer · 2 applied</span></div>
              </div>
              <div className="hero-preview-list">
                <div className="hero-preview-item done"><span className="dot" /> Review CF Round #980 solutions — <em>Done</em></div>
                <div className="hero-preview-item"><span className="dot" /> Prepare architecture doc for StarWaves v2</div>
                <div className="hero-preview-item"><span className="dot" /> Submit application — Senior Full-Stack</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="hero-scroll-cue" aria-hidden="true">
        <span>Scroll to explore</span>
        <ChevronDown size={18} />
      </div>
    </section>
  )
}
