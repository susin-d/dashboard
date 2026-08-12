import { useState, useEffect, useRef } from 'react'
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
  Shield,
} from 'lucide-react'
import { StarWavesLogo } from '../components/StarWavesLogo'

/* ═══════════════════════════════════════════════════════
   Star-Field Canvas — animated particle background
   ═══════════════════════════════════════════════════════ */
function StarFieldCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    let animId = 0
    let stars = []
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function resize() {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function seed() {
      const w = canvas.getBoundingClientRect().width
      const h = canvas.getBoundingClientRect().height
      const n = Math.min(Math.floor((w * h) / 1600), 600)
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.3,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.08,
        o: Math.random() * 0.5 + 0.12,
        ts: Math.random() * 0.006 + 0.002,
        tp: Math.random() * Math.PI * 2,
      }))
    }

    function frame(t) {
      const { width: w, height: h } = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        if (!reducedMotion) {
          s.x += s.vx
          s.y += s.vy
          if (s.x < -2) s.x = w + 2
          if (s.x > w + 2) s.x = -2
          if (s.y < -2) s.y = h + 2
          if (s.y > h + 2) s.y = -2
        }
        const tw = Math.sin(t * s.ts + s.tp) * 0.35 + 0.65
        ctx.globalAlpha = s.o * tw
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
      }
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(frame)
    }

    resize()
    seed()
    animId = requestAnimationFrame(frame)

    const onResize = () => {
      resize()
      seed()
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="star-field-canvas" aria-hidden="true" />
}

/* ═══════════════════════════════════════════════════════
   Scroll Reveal — IntersectionObserver hook
   ═══════════════════════════════════════════════════════ */
function useScrollReveal() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' },
    )
    const timer = setTimeout(() => {
      document.querySelectorAll('.scroll-reveal').forEach((el) =>
        reduced ? el.classList.add('revealed') : io.observe(el),
      )
    }, 120)
    return () => {
      clearTimeout(timer)
      io.disconnect()
    }
  }, [])
}

/* ═══════════════════════════════════════════════════════
   Animated Counter — counts up when scrolled into view
   ═══════════════════════════════════════════════════════ */
function AnimatedCounter({ target, suffix = '', prefix = '' }) {
  const ref = useRef(null)
  const [val, setVal] = useState(0)
  const fired = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !fired.current) {
          fired.current = true
          io.unobserve(el)
          const dur = 1800
          const t0 = performance.now()
          const tick = (now) => {
            const p = Math.min((now - t0) / dur, 1)
            setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [target])

  return (
    <span ref={ref} className="stat-counter">
      {prefix}{val}{suffix}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════
   Static Data
   ═══════════════════════════════════════════════════════ */
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

const cinemaStats = [
  { target: 7, suffix: '+', label: 'Integrated Modules', sub: 'Tasks, calendar, code & jobs' },
  { target: 100, suffix: '%', label: 'Monochrome Focus', sub: 'Zero clutter, pure clarity' },
  { text: 'Real-time', label: 'Live Sync', sub: 'Always synced across tabs' },
  { target: 50, prefix: '< ', suffix: 'ms', label: 'Instant Load', sub: 'Built for extreme velocity' },
]

const workflowSteps = [
  {
    step: '01',
    title: 'Consolidate Everything',
    description:
      'Connect your tasks, calendars, competitive coding handles, and job applications into a single dashboard.',
    icon: Layers,
  },
  {
    step: '02',
    title: 'Tailor Your Space',
    description:
      'Arrange and customize modular widgets. Toggle views between Kanban, Calendar, and List layouts.',
    icon: LayoutDashboard,
  },
  {
    step: '03',
    title: 'Achieve with Velocity',
    description:
      'Focus on what matters most each day without context-switching between fragmented tools.',
    icon: Zap,
  },
]

const faqItems = [
  {
    question: 'How does StarWaves keep my work focused?',
    answer:
      'StarWaves combines your essential developer tools—tasks, calendar, competitive coding tracker, hackathons, job applications, and project docs—into a clean, distraction-free monochrome interface designed for high deep-work concentration.',
  },
  {
    question: 'Can I sync Google Calendar or import external ICS schedules?',
    answer:
      'Yes! StarWaves supports seamless Google Calendar sync as well as custom ICS calendar file imports so your deadlines and personal schedule are always unified in one timeline.',
  },
  {
    question: 'Which competitive coding platforms are supported?',
    answer:
      'StarWaves tracks contest schedules and rating analytics from major platforms including Codeforces, LeetCode, and CodeChef.',
  },
  {
    question: 'Is my workspace data private and secure?',
    answer:
      'Absolutely. StarWaves is built on top of Firebase infrastructure with strict user authentication and isolated dataset controls. Your work and data belong entirely to you.',
  },
  {
    question: 'Can I access StarWaves on mobile devices?',
    answer:
      'Yes, StarWaves is fully responsive across mobile, tablet, and desktop viewports, with native PWA and mobile layout optimizations.',
  },
  {
    question: 'How does StarWaves use my Google account data?',
    answer:
      'StarWaves only requests access to specific Google services you choose to connect — such as Google Calendar (to display your events), Gmail (to manage messages within the app), and Google Drive (to import documents). Your data is used solely within your workspace and is never shared with third parties. You can disconnect any Google service at any time from your account settings.',
  },
]

/* ═══════════════════════════════════════════════════════
   Landing Page Component
   ═══════════════════════════════════════════════════════ */
export function LandingPage({ user, onNavigate }) {
  useScrollReveal()

  const [activeTab, setActiveTab] = useState('dashboard')
  const [openFaq, setOpenFaq] = useState(0)
  const [demoTasks, setDemoTasks] = useState([
    { id: 1, text: 'Review Codeforces Round #980 solutions', done: true, priority: 'High' },
    { id: 2, text: 'Prepare system architecture doc for StarWaves v2', done: false, priority: 'High' },
    { id: 3, text: 'Submit application for Senior Full-Stack Engineer', done: false, priority: 'Medium' },
  ])

  const toggleDemoTask = (id) => {
    setDemoTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  const scrollToShowcase = () => {
    document.getElementById('landing-showcase')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main id="main-content" className="public-page landing-cinematic" tabIndex={-1}>
      {/* ── Navigation ── */}
      <nav className="public-nav" aria-label="Public navigation">
        <button className="public-brand" onClick={() => onNavigate('/')}>
          <StarWavesLogo size={28} /> StarWaves
        </button>
        <div className="public-nav-actions">
          {user ? (
            <button className="public-nav-cta" onClick={() => onNavigate('/app/dashboard')}>
              Dashboard <ArrowRight size={14} />
            </button>
          ) : (
            <>
              <button className="public-login-link" onClick={() => onNavigate('/login')}>
                Log in
              </button>
              <button className="public-nav-cta" onClick={() => onNavigate('/signup')}>
                Get started <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Scene 1 · Cinematic Hero ── */}
      <section className="cinematic-hero">
        <StarFieldCanvas />
        <div className="cinematic-hero-content">
          <div className="hero-eyebrow hero-enter hero-enter-d1">
            <Sparkles size={13} />
            <span>One workspace. Every ambition.</span>
          </div>
          <h1 className="hero-headline hero-enter hero-enter-d2">
            Your work and growth,<br />finally in sync.
          </h1>
          <p className="hero-subtitle hero-enter hero-enter-d3">
            StarWaves brings tasks, calendars, coding contests, hackathons,
            projects, job applications, and documents into one focused
            monochrome interface — so you can stay organized without switching tools.
          </p>
          <div className="hero-cta-group hero-enter hero-enter-d4">
            <button className="cta-primary cta-hero" onClick={() => onNavigate('/signup')}>
              Start your journey <ArrowRight size={17} />
            </button>
            <button className="cta-ghost" onClick={scrollToShowcase}>
              See it in action <ChevronDown size={15} />
            </button>
          </div>
          <div className="hero-proof-row hero-enter hero-enter-d5">
            <span><CheckCircle2 size={14} /> Custom dashboard</span>
            <span><CheckCircle2 size={14} /> Unified calendar</span>
            <span><CheckCircle2 size={14} /> Competitive stats</span>
            <span><CheckCircle2 size={14} /> Career pipeline</span>
          </div>
        </div>
        <div className="hero-scroll-cue" aria-hidden="true">
          <span>Scroll to explore</span>
          <ChevronDown size={18} />
        </div>
      </section>

      {/* ── Scene 2 · Product Showcase ── */}
      <section className="landing-showcase" id="landing-showcase">
        <div className="showcase-inner">
          <div className="landing-section-heading text-center scroll-reveal">
            <p className="section-eyebrow">See it in action</p>
            <h2>A workspace that works the way you do</h2>
          </div>
          <div
            className="landing-product-preview scroll-reveal reveal-delay-2"
            aria-label="StarWaves interactive workspace preview"
          >
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
                        <small>TODAY&apos;S SCHEDULE</small>
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
                        {i === 2 && (
                          <div className="cal-event-pill highlight">StarWaves Sprint Demo</div>
                        )}
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
                    <h2>Contests &amp; Performance</h2>
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
                        <button
                          className="contest-remind-btn"
                          onClick={() => onNavigate('/signup')}
                        >
                          Remind me
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'jobs' && (
                <div className="preview-tab-content fade-in">
                  <div className="preview-header">
                    <small>CAREER &amp; OPPORTUNITIES</small>
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
        </div>
      </section>

      {/* ── Scene 3 · Stats Ticker ── */}
      <section className="landing-stats-ticker landing-stats-dark">
        <div className="stats-ticker-grid">
          {cinemaStats.map(({ target, suffix, prefix, text, label, sub }) => (
            <div key={label} className="stat-ticker-item scroll-reveal">
              <strong>
                {target != null ? (
                  <AnimatedCounter target={target} suffix={suffix || ''} prefix={prefix || ''} />
                ) : (
                  text
                )}
              </strong>
              <div className="stat-ticker-info">
                <span>{label}</span>
                <small>{sub}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scene 4 · Features ── */}
      <section className="landing-feature-section">
        <div className="landing-section-heading scroll-reveal">
          <p className="section-eyebrow">Built for momentum</p>
          <h2>Everything important, without the noise.</h2>
          <span className="section-subtitle">
            A cohesive suite of personal organization tools crafted with strict monochrome precision.
          </span>
        </div>
        <div className="landing-feature-grid">
          {features.map(({ icon: Icon, badge, title, copy }, i) => (
            <article
              key={title}
              className={`landing-feature-card scroll-reveal reveal-delay-${i + 1}`}
            >
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

      {/* ── Scene 5 · Workflow Timeline ── */}
      <section className="landing-workflow-section">
        <div className="landing-section-heading text-center scroll-reveal">
          <p className="section-eyebrow">Your Journey</p>
          <h2>How StarWaves powers your growth</h2>
        </div>
        <div className="workflow-timeline-container">
          {workflowSteps.map(({ step, title, description, icon: StepIcon }, i) => (
            <div
              key={step}
              className={`workflow-timeline-step scroll-reveal reveal-delay-${i + 1}`}
            >
              <div className="workflow-step-marker">
                <span className="marker-dot" />
                {i < workflowSteps.length - 1 && <span className="marker-line" />}
              </div>
              <div className="workflow-step-body">
                <span className="workflow-step-num">{step}</span>
                <div className="workflow-step-icon-box">
                  <StepIcon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scene 6 · FAQ ── */}
      <section className="landing-faq-section">
        <div className="landing-section-heading scroll-reveal">
          <p className="section-eyebrow">Frequently Asked Questions</p>
          <h2>Everything you need to know</h2>
        </div>
        <div className="landing-faq-list">
          {faqItems.map((item, index) => {
            const isOpen = openFaq === index
            return (
              <div
                key={item.question}
                className={`faq-item scroll-reveal reveal-delay-${Math.min(index + 1, 6)} ${isOpen ? 'open' : ''}`}
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

      {/* ── Scene 7 · Google Data Transparency ── */}
      <section className="landing-google-data-section scroll-reveal" id="google-data-usage">
        <div className="landing-section-heading">
          <p className="section-eyebrow">Google Integration &amp; Data Transparency</p>
          <h2>How StarWaves uses your Google data</h2>
          <span className="section-subtitle">
            StarWaves integrates with Google services to bring your existing tools into one workspace.
            Your data is only used within your personal workspace and is never sold or shared with
            third parties.
          </span>
        </div>
        <div className="google-data-grid">
          <div className="google-data-card">
            <div className="google-data-card-icon">
              <CalendarDays size={20} />
            </div>
            <h3>Google Calendar</h3>
            <p className="google-data-scope">calendar.readonly</p>
            <p>
              StarWaves reads your Google Calendar events so you can view your schedule alongside
              tasks, coding contests, and deadlines — all in one unified timeline. StarWaves does not
              modify or delete any of your calendar data.
            </p>
          </div>
          <div className="google-data-card">
            <div className="google-data-card-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h3>Gmail</h3>
            <p className="google-data-scope">gmail.readonly, gmail.modify, gmail.send</p>
            <p>
              When you connect Gmail, StarWaves lets you read, compose, and manage emails directly
              within your workspace. This is entirely optional and only activated when you explicitly
              connect your Gmail account.
            </p>
          </div>
          <div className="google-data-card">
            <div className="google-data-card-icon">
              <FolderKanban size={20} />
            </div>
            <h3>Google Drive</h3>
            <p className="google-data-scope">drive.metadata.readonly, drive.file</p>
            <p>
              StarWaves can import and display your recent Google Drive files so you can access
              project documents without leaving your workspace. Only metadata and files you choose to
              import are accessed.
            </p>
          </div>
          <div className="google-data-card">
            <div className="google-data-card-icon">
              <Shield size={20} />
            </div>
            <h3>Authentication</h3>
            <p className="google-data-scope">openid, email, profile</p>
            <p>
              StarWaves uses Google Sign-In to securely authenticate your identity. We only receive
              your name, email address, and profile picture to create and manage your account.
            </p>
          </div>
        </div>
        <div className="google-data-footer">
          <p>
            You can disconnect any Google service at any time from your account settings. For full
            details on how we handle your data, read our{' '}
            <button className="inline-link" onClick={() => onNavigate('/privacy')}>
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </section>

      {/* ── Scene 8 · Cinematic Final CTA ── */}
      <section className="cinematic-final-cta">
        <div className="final-cta-spotlight" aria-hidden="true" />
        <div className="final-cta-inner scroll-reveal">
          <p className="section-eyebrow">Ready when you are</p>
          <h2>Build a workspace that moves with your ambition.</h2>
          <p className="final-cta-sub">
            Join developers, competitive coders, and builders organizing their daily progress on
            StarWaves.
          </p>
          <div className="final-cta-buttons">
            {user ? (
              <button
                className="cta-primary cta-hero"
                onClick={() => onNavigate('/app/dashboard')}
              >
                Go to Dashboard <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <button className="cta-primary cta-hero" onClick={() => onNavigate('/signup')}>
                  Create your account <ArrowRight size={18} />
                </button>
                <button className="cta-ghost" onClick={() => onNavigate('/login')}>
                  Log in to workspace
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
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
