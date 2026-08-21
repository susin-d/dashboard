import { workflowSteps } from '../constants'

export function WorkflowSection() {
  return (
    <section className="landing-workflow-section" id="workflow">
      <div className="landing-section-heading text-center scroll-reveal">
        <p className="section-eyebrow">Your Journey</p>
        <h2>How StarWaves powers your growth</h2>
        <span className="section-subtitle" style={{ marginInline: 'auto' }}>From scattered tabs to a single source of truth — in three calm steps.</span>
      </div>
      <div className="workflow-timeline-container">
        {workflowSteps.map(({ step, title, description, icon: StepIcon }, i) => (
          <div key={step} className={`workflow-timeline-step scroll-reveal reveal-delay-${i + 1}`}>
            <div className="workflow-step-marker">
              <span className="marker-dot" />
              {i < workflowSteps.length - 1 && <span className="marker-line" />}
            </div>
            <div className="workflow-step-body">
              <span className="workflow-step-num">{step}</span>
              <div className="workflow-step-icon-box"><StepIcon size={22} aria-hidden="true" /></div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
