import { integrations } from '../constants'

export function IntegrationsBar() {
  return (
    <section className="landing-integrations-bar scroll-reveal" aria-label="Integrations">
      <div className="integrations-inner">
        <p className="integrations-label">Connects with tools you already use</p>
        <div className="integrations-marquee" role="list">
          {integrations.map((item) => (
            <span key={item.name} className="integration-pill" role="listitem">
              {item.name}
            </span>
          ))}
          <span className="integration-pill muted" role="listitem">+ more</span>
        </div>
        <p className="integrations-hint">Google Calendar • Gmail • Drive • Chat • GitHub • Codeforces • LeetCode • WhatsApp</p>
      </div>
    </section>
  )
}
