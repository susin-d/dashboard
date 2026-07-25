import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Code2,
  FolderKanban,
  LayoutDashboard,
  Rocket,
} from 'lucide-react'
import { StarWavesLogo } from '../components/StarWavesLogo'

const features = [
  { icon: CheckCircle2, title: 'Tasks', copy: 'Plan daily work and keep every deadline visible.' },
  { icon: CalendarDays, title: 'Calendar', copy: 'See tasks, contests, jobs, and events in one timeline.' },
  { icon: Code2, title: 'Coding', copy: 'Track contests and your competitive coding progress.' },
  { icon: FolderKanban, title: 'Projects', copy: 'Follow progress, links, teams, and technologies.' },
  { icon: Rocket, title: 'Opportunities', copy: 'Organize hackathons and job applications together.' },
  { icon: LayoutDashboard, title: 'Your dashboard', copy: 'Resize and arrange the workspace around your priorities.' },
]

export function LandingPage({ onNavigate }) {
  return (
    <main className="public-page">
      <nav className="public-nav" aria-label="Public navigation">
        <button className="public-brand" onClick={() => onNavigate('/')}>
          <StarWavesLogo size={28} /> StarWaves
        </button>
        <div>
          <button className="public-login-link" onClick={() => onNavigate('/login')}>Log in</button>
          <button className="public-nav-cta" onClick={() => onNavigate('/signup')}>Get started</button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">One workspace. Every ambition.</p>
          <h1>Keep your work and growth in sync.</h1>
          <p className="landing-intro">
            StarWaves brings tasks, calendars, coding contests, hackathons,
            projects, applications, and documents into one focused workspace.
          </p>
          <div className="landing-actions">
            <button onClick={() => onNavigate('/signup')}>Start organizing <ArrowRight size={17} /></button>
            <button onClick={() => onNavigate('/login')}>Open your workspace</button>
          </div>
          <div className="landing-proof">
            <span><CheckCircle2 size={14} /> Custom dashboard</span>
            <span><CheckCircle2 size={14} /> Unified calendar</span>
            <span><CheckCircle2 size={14} /> Progress stats</span>
          </div>
        </div>

        <div className="landing-product-preview" aria-label="StarWaves dashboard preview">
          <div className="landing-preview-top"><StarWavesLogo size={18} /><i /><i /><i /></div>
          <div className="landing-preview-shell">
            <aside><b /><b /><b /><b /><b /></aside>
            <div>
              <p>OVERVIEW</p>
              <h2>Dashboard</h2>
              <section>
                <article><small>TODAY</small><strong>4</strong><span>Events on your schedule</span></article>
                <article><small>PROJECTS</small><strong>72%</strong><span>Current progress</span></article>
                <article><small>CODING</small><strong>1,482</strong><span>Current rating</span></article>
                <article><small>JOBS</small><strong>2</strong><span>Active applications</span></article>
              </section>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-feature-section">
        <div className="landing-section-heading">
          <p>Built for momentum</p>
          <h2>Everything important, without the noise.</h2>
        </div>
        <div className="landing-feature-grid">
          {features.map(({ icon: Icon, title, copy }) => (
            <article key={title}>
              <span><Icon size={19} /></span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final-cta">
        <div><p>Ready when you are</p><h2>Build a workspace that moves with you.</h2></div>
        <button onClick={() => onNavigate('/signup')}>Create your account <ArrowRight size={17} /></button>
      </section>

      <footer className="public-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><StarWavesLogo size={22} /> StarWaves</span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button onClick={() => onNavigate('/privacy')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', font: 'inherit', fontSize: '12px' }}>Privacy Policy</button>
          <span>•</span>
          <button onClick={() => onNavigate('/terms')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', font: 'inherit', fontSize: '12px' }}>Terms of Service</button>
        </div>
        <small>© 2026 StarWaves</small>
      </footer>
    </main>
  )
}
