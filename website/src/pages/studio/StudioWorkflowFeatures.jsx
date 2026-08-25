import { Bot, Code2, Sparkles } from 'lucide-react'

const FEATURES = [
  {
    icon: Bot,
    title: '1. Intelligent Planning',
    description: 'Eve breaks down your prompt into architecture, data schemas, and API contracts for your review.',
  },
  {
    icon: Code2,
    title: '2. Autonomous Coding',
    description: 'Generates production-grade multi-file frontend and backend logic in isolated project sandboxes.',
  },
  {
    icon: Sparkles,
    title: '3. Live Preview & Refine',
    description: 'Interact with running preview browsers instantly and iterate features naturally in chat.',
  },
]

export function StudioWorkflowFeatures() {
  return (
    <section className="studio-section studio-workflow-section" aria-label="Studio workflow">
      <div className="studio-section-header">
        <h2 className="studio-section-title">How Eve Studio works</h2>
      </div>
      <div className="studio-features-grid">
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <article key={feature.title} className="studio-feature-card">
              <div className="studio-feature-icon">
                <Icon size={18} aria-hidden="true" />
              </div>
              <h3 className="studio-feature-title">{feature.title}</h3>
              <p className="studio-feature-desc">{feature.description}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
