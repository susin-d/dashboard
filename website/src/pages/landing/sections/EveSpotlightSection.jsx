import { Bot, PhoneCall, CalendarClock, Sparkles, Check } from 'lucide-react'
import { eveHighlights } from '../constants'

const icons = [Bot, PhoneCall, CalendarClock]

export function EveSpotlightSection({ onNavigate }) {
  return (
    <section className="landing-eve-section" id="eve" aria-label="Eve AI spotlight">
      <div className="eve-spotlight-glow" aria-hidden="true" />
      <div className="eve-spotlight-inner">
        <div className="landing-section-heading text-center scroll-reveal">
          <p className="section-eyebrow" style={{ color: '#a1a1aa' }}><Sparkles size={12} aria-hidden="true" /> Eve AI — your workspace companion</p>
          <h2 style={{ color: '#fff' }}>An assistant that lives inside your work.</h2>
          <span className="section-subtitle" style={{ color: '#a1a1aa', maxWidth: 680, marginInline: 'auto' }}>
            Not a chatbot tab. Eve reads your files, remembers your context, browses the web, manages WhatsApp and even calls you when you need a nudge.
          </span>
        </div>
        <div className="eve-highlights-grid">
          {eveHighlights.map(({ title, desc, points }, idx) => {
            const Icon = icons[idx]
            return (
              <article key={title} className={`eve-highlight-card scroll-reveal reveal-delay-${idx + 1}`}>
                <div className="eve-highlight-icon"><Icon size={20} aria-hidden="true" /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
                <ul>
                  {points.map((p) => (
                    <li key={p}><Check size={12} aria-hidden="true" /> {p}</li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>
        <div className="eve-code-preview scroll-reveal reveal-delay-2" aria-hidden="true">
          <div className="eve-code-top"><span className="code-dot" /><span className="code-dot" /><span className="code-dot" /><span className="code-title">eve tools → workspace aware</span></div>
          <pre>{`list_workspace_files({ workspace: "starwaves" })
search_workspace_files({ query: "auth callback" })
browse_web({ query: "Vercel cron serverless" })
send_whatsapp_message({ chatId: "#team", text: "Sprint demo at 3pm" })
create_eve_schedule({ cron: "0 9 * * 1", action: "call", prompt: "Review jobs pipeline" })`}</pre>
        </div>
        <div className="eve-cta-row scroll-reveal">
          <button className="cta-primary cta-hero" onClick={() => onNavigate('/signup')}>Talk to Eve — free to start <Sparkles size={16} aria-hidden="true" /></button>
          <span className="eve-cta-hint">Choose OpenAI · Anthropic · Gemini · your key or ours</span>
        </div>
      </div>
    </section>
  )
}
