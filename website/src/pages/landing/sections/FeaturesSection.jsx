import { features } from '../constants'

export function FeaturesSection() {
  return (
    <section className="landing-feature-section" id="features">
      <div className="landing-section-heading scroll-reveal">
        <p className="section-eyebrow">Built for momentum</p>
        <h2>Everything important, without the noise.</h2>
        <span className="section-subtitle">A cohesive suite of personal organization tools crafted with strict monochrome precision. No gradients, no clutter — just signal.</span>
      </div>
      <div className="landing-feature-grid">
        {features.map(({ icon: Icon, badge, title, copy }, i) => (
          <article key={title} className={`landing-feature-card scroll-reveal reveal-delay-${(i % 4) + 1}`}>
            <div className="feature-card-top">
              <span className="feature-icon-wrapper"><Icon size={20} aria-hidden="true" /></span>
              <span className="feature-badge">{badge}</span>
            </div>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
