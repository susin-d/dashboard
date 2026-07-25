import { useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Code2,
  FolderKanban,
  LayoutDashboard,
  Rocket,
  Zap,
  Layers,
  Sparkles,
  Check,
  Clock,
  Briefcase,
  TrendingUp,
} from 'lucide-react'
import { StarWavesLogo } from '../components/StarWavesLogo'

const previewTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'coding', label: 'Coding', icon: Code2 },
  { id: 'jobs', label: 'Jobs', icon: Rocket },
]

const features = [
  {
    icon: CheckCircle2,
    badge: 'Organize',
    title: 'Smart Task Management',
    copy: 'Plan daily work, categorize priorities, and keep every milestone visible with intuitive filters.',
  },
  {
    icon: CalendarDays,
    badge: 'Timeline',
    title: 'Unified Workspace Calendar',
    copy: 'Merge task deadlines, coding contests, job interviews, and Google Calendar events into one clear schedule.',
  },
  {
    icon: Code2,
    badge: 'Growth',
    title: 'Competitive Coding Hub',
    copy: 'Track live contest schedules, ratings, and problem stats across Codeforces, LeetCode, and CodeChef.',
  },
  {
    icon: FolderKanban,
    badge: 'Projects',
    title: 'Project Command Center',
    copy: 'Follow progress, store tech stacks, link repositories, and coordinate team deliverables effortlessly.',
  },
  {
    icon: Rocket,
    badge: 'Careers',
    title: 'Job & Hackathon Tracker',
    copy: 'Manage application pipelines, interview stages, hackathon submissions, and document links in one place.',
  },
  {
    icon: LayoutDashboard,
    badge: 'Custom',
    title: 'Modular Dashboard Layout',
    copy: 'Customize, resize, and arrange your widget layout to match your exact daily workflow priorities.',
  },
]

const statsTicker = [
  { value: '100%', label: 'Monochrome Focus', sub: 'Zero clutter, pure clarity' },
  { value: '7-in-1', label: 'Integrated Modules', sub: 'Tasks, calendar, code & jobs' },
  { value: 'Real-time', label: 'Live Sync', sub: 'Always synced across tabs' },
  { value: '< 50ms', label: 'Instant Load', sub: 'Built for extreme velocity' },
]

const workflowSteps = [
  {
    step: '01',
    title: 'Consolidate Everything',
    description: 'Connect your tasks, calendars, competitive coding handles, and job applications into a single dashboard.',
    icon: Layers,
  },
  {
    step: '02',
    title: 'Tailor Your Space',
    description: 'Arrange and customize modular widgets. Toggle views between Kanban, Calendar, and List layouts.',
    icon: LayoutDashboard,
  },
  {
    step: '03',
    title: 'Achieve with Velocity',
    description: 'Focus on what matters most each day without context-switching between fragmented tools.',
    icon: Zap,
  },
]

const faqItems = [
  {
    question: 'How does StarWaves keep my work focused?',
    answer: 'StarWaves combines your essential developer tools—tasks, calendar, competitive coding tracker, hackathons, job applications, and project docs—into a clean, distraction-free monochrome interface designed for high deep-work concentration.',
  },
  {
    question: 'Can I sync Google Calendar or import external ICS schedules?',
    answer: 'Yes! StarWaves supports seamless Google Calendar sync as well as custom ICS calendar file imports so your deadlines and personal schedule are always unified in one timeline.',
  },
  {
    question: 'Which competitive coding platforms are supported?',
    answer: 'StarWaves tracks contest schedules and rating analytics from major platforms including Codeforces, LeetCode, and CodeChef.',
  },
  {
    question: 'Is my workspace data private and secure?',
    answer: 'Absolutely. StarWaves is built on top of Firebase infrastructure with strict user authentication and isolated dataset controls. Your work and data belong entirely to you.',
  },
  {
    question: 'Can I access StarWaves on mobile devices?',
    answer: 'Yes, StarWaves is fully responsive across mobile, tablet, and desktop viewports, with native PWA and mobile layout optimizations.',
  },
]

export function LandingPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [openFaq, setOpenFaq] = useState(0)
  const [demoTasks, setDemoTasks] = useState([
    { id: 1, text: 'Review Codeforces Round #980 solutions', done: true, priority: 'High' },
    { id: 2, text: 'Prepare system architecture doc for StarWaves v2', done: false, priority: 'High' },
    { id: 3, text: 'Submit application for Senior Full-Stack Engineer', done: false, priority: 'Medium' },
  ])

  const toggleDemoTask = (id) => {
    setDemoTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    )
  }

  return (
    <main className="public-page">
      {/* Navigation */}
      <nav className="public-nav" aria-label="Public navigation">
        <button className="public-brand" onClick={() => onNavigate('/')}>
          <StarWavesLogo size={28} /> StarWaves
        </button>
        <div className="public-nav-actions">
          <button className="public-login-link" onClick={() => onNavigate('/login')}>
            Log in
          </button>
          <button className="public-nav-cta" onClick={() => onNavigate('/signup')}>
            Get started <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow-pill">
            <Sparkles size={13} />
            <span>One workspace. Every ambition.</span>
          </div>
          <h1>Keep your work and growth in sync.</h1>
          <p className="landing-intro">
            StarWaves brings tasks, calendars, coding contests, hackathons,
            projects, applications, and documents into one focused monochrome workspace.
          </p>
          <div className="landing-actions">
            <button className="cta-primary" onClick={() => onNavigate('/signup')}>
              Start organizing <ArrowRight size={17} />
            </button>
            <button className="cta-secondary" onClick={() => onNavigate('/login')}>
              Open workspace
            </button>
          </div>
          <div className="landing-proof">
            <span><CheckCircle2 size={14} /> Custom dashboard</span>
            <span><CheckCircle2 size={14} /> Unified calendar</span>
            <span><CheckCircle2 size={14} /> Competitive stats</span>
            <span><CheckCircle2 size={14} /> Career pipeline</span>
          </div>
        </div>

        {/* Interactive Workspace Preview */}
        <div className="landing-product-preview" aria-label="StarWaves interactive workspace preview">
          <div className="landing-preview-top">
            <div className="landing-preview-brand">
              <StarWavesLogo size={18} />
              <span>starwaves.app</span>
            </div>
            <div className="landing-preview-dots">
              <i /><i /><i />
            </div>
          </div>

          <div className="landing-preview-tab-bar">
            {previewTabs.map(({ id, label, icon: TabIcon }) => (
              <button
                key={id}
                className={`preview-tab-btn ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <TabIcon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="landing-preview-shell">
            {activeTab === 'dashboard' && (
              <div className="preview-tab-content fade-in">
                <div className="preview-header">
                  <small>WORKSPACE OVERVIEW</small>
                  <h2>Dashboard</h2>
                </div>
                <div className="preview-grid-cards">
                  <div className="preview-card">
                    <div className="preview-card-meta">
                      <Clock size={14} />
                      <small>TODAY'S SCHEDULE</small>
                    </div>
                    <strong>4 Events</strong>
                    <span>2 tasks, 1 contest, 1 interview</span>
                  </div>
                  <div className="preview-card">
                    <div className="preview-card-meta">
                      <TrendingUp size={14} />
                      <small>PROJECT PROGRESS</small>
                    </div>
                    <strong>78% Completed</strong>
                    <span>12 active tasks in sprint</span>
                  </div>
                  <div className="preview-card">
                    <div className="preview-card-meta">
                      <Code2 size={14} />
                      <small>CODEFORCES RATING</small>
                    </div>
                    <strong>1,648 Expert</strong>
                    <span>+42 rating gain this month</span>
                  </div>
                  <div className="preview-card">
                    <div className="preview-card-meta">
                      <Briefcase size={14} />
                      <small>JOB PIPELINE</small>
                    </div>
                    <strong>3 Active</strong>
                    <span>1 interview scheduled</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="preview-tab-content fade-in">
                <div className="preview-header">
                  <small>PRIORITY QUEUE</small>
                  <h2>Tasks (Interactive Demo)</h2>
                </div>
                <div className="preview-demo-task-list">
                  {demoTasks.map((t) => (
                    <div
                      key={t.id}
                      className={`preview-task-item ${t.done ? 'completed' : ''}`}
                      onClick={() => toggleDemoTask(t.id)}
                    >
                      <div className="task-checkbox">
                        {t.done && <Check size={12} />}
                      </div>
                      <span className="task-text">{t.text}</span>
                      <span className="task-priority-badge">{t.priority}</span>
                    </div>
                  ))}
                  <p className="preview-hint">Click any task above to toggle state</p>
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="preview-tab-content fade-in">
                <div className="preview-header">
                  <small>TIMELINE</small>
                  <h2>Unified Calendar</h2>
                </div>
                <div className="preview-calendar-grid">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                    <div key={day} className={`calendar-day-col ${i === 2 ? 'today' : ''}`}>
                      <span className="day-name">{day}</span>
                      <span className="day-num">{20 + i}</span>
                      {i === 1 && <div className="cal-event-pill">Codeforces Div 2</div>}
                      {i === 2 && <div className="cal-event-pill highlight">StarWaves Sprint Demo</div>}
                      {i === 4 && <div className="cal-event-pill">Tech Interview</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'coding' && (
              <div className="preview-tab-content fade-in">
                <div className="preview-header">
                  <small>COMPETITIVE STATS</small>
                  <h2>Contests & Performance</h2>
                </div>
                <div className="preview-coding-stats">
                  <div className="coding-stat-box">
                    <span className="platform-tag">Codeforces</span>
                    <strong>1,648</strong>
                    <small>Max: 1,720 (Specialist / Expert)</small>
                  </div>
                  <div className="coding-stat-box">
                    <span className="platform-tag">LeetCode</span>
                    <strong>1,912</strong>
                    <small>Knight • 450+ solved</small>
                  </div>
                  <div className="coding-stat-box full-width">
                    <div className="contest-upcoming-row">
                      <div>
                        <strong>Codeforces Round #982 (Div. 2)</strong>
                        <span>Tomorrow • 14:35 UTC</span>
                      </div>
                      <button className="contest-remind-btn">Remind me</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className="preview-tab-content fade-in">
                <div className="preview-header">
                  <small>CAREER & OPPORTUNITIES</small>
                  <h2>Application Pipeline</h2>
                </div>
                <div className="preview-kanban">
                  <div className="kanban-col">
                    <span>Applied (2)</span>
                    <div className="kanban-card">
                      <strong>Frontend Engineer</strong>
                      <small>Stripe • Submitted 2d ago</small>
                    </div>
                  </div>
                  <div className="kanban-col">
                    <span>Interviewing (1)</span>
                    <div className="kanban-card highlight">
                      <strong>Staff AI Engineer</strong>
                      <small>Anthropic • Technical round</small>
                    </div>
                  </div>
                  <div className="kanban-col">
                    <span>Offer (1)</span>
                    <div className="kanban-card">
                      <strong>Systems Architect</strong>
                      <small>Vercel • Offer review</small>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Metrics Ticker Banner */}
      <section className="landing-stats-ticker">
        <div className="stats-ticker-grid">
          {statsTicker.map(({ value, label, sub }) => (
            <div key={label} className="stat-ticker-item">
              <strong>{value}</strong>
              <div className="stat-ticker-info">
                <span>{label}</span>
                <small>{sub}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Section */}
      <section className="landing-feature-section">
        <div className="landing-section-heading">
          <p className="section-eyebrow">Built for momentum</p>
          <h2>Everything important, without the noise.</h2>
          <span className="section-subtitle">
            A cohesive suite of personal organization tools crafted with strict monochrome precision.
          </span>
        </div>
        <div className="landing-feature-grid">
          {features.map(({ icon: Icon, badge, title, copy }) => (
            <article key={title} className="landing-feature-card">
              <div className="feature-card-top">
                <span className="feature-icon-wrapper">
                  <Icon size={20} />
                </span>
                <span className="feature-badge">{badge}</span>
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Workflow Timeline Section */}
      <section className="landing-workflow-section">
        <div className="landing-section-heading text-center">
          <p className="section-eyebrow">Simple Workflow</p>
          <h2>How StarWaves powers your growth</h2>
        </div>
        <div className="workflow-steps-grid">
          {workflowSteps.map(({ step, title, description, icon: StepIcon }) => (
            <div key={step} className="workflow-step-card">
              <div className="workflow-step-number">{step}</div>
              <div className="workflow-icon-box">
                <StepIcon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="landing-faq-section">
        <div className="landing-section-heading">
          <p className="section-eyebrow">Frequently Asked Questions</p>
          <h2>Everything you need to know</h2>
        </div>
        <div className="landing-faq-list">
          {faqItems.map((item, index) => {
            const isOpen = openFaq === index
            return (
              <div
                key={item.question}
                className={`faq-item ${isOpen ? 'open' : ''}`}
                onClick={() => setOpenFaq(isOpen ? -1 : index)}
              >
                <div className="faq-question">
                  <h3>{item.question}</h3>
                  <button className="faq-toggle-btn" aria-label="Toggle answer">
                    <ChevronDown size={18} className={isOpen ? 'rotate-180' : ''} />
                  </button>
                </div>
                {isOpen && (
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="landing-final-cta">
        <div className="final-cta-content">
          <p className="section-eyebrow">Ready when you are</p>
          <h2>Build a workspace that moves with your ambition.</h2>
          <p className="final-cta-sub">
            Join developers, competitive coders, and builders organizing their daily progress on StarWaves.
          </p>
        </div>
        <div className="final-cta-actions">
          <button className="cta-primary large" onClick={() => onNavigate('/signup')}>
            Create your account <ArrowRight size={18} />
          </button>
          <button className="cta-secondary large" onClick={() => onNavigate('/login')}>
            Log in to workspace
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="public-footer">
        <div className="footer-brand">
          <StarWavesLogo size={22} />
          <span>StarWaves</span>
        </div>
        <div className="footer-links">
          <button onClick={() => onNavigate('/privacy')}>Privacy Policy</button>
          <span>•</span>
          <button onClick={() => onNavigate('/terms')}>Terms of Service</button>
        </div>
        <small>© 2026 StarWaves. All rights reserved.</small>
      </footer>
    </main>
  )
}
