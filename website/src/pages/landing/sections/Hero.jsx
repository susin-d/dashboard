import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, ChevronDown, Check, Sparkles, Play } from 'lucide-react'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.18 } },
}
const item = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

export function Hero({ onNavigate }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const ySlow = useTransform(scrollYProgress, [0, 1], [0, 80])
  const yFast = useTransform(scrollYProgress, [0, 1], [0, 160])
  const opacity = useTransform(scrollYProgress, [0, 0.65], [1, 0])

  const scrollToShowcase = () => {
    document.getElementById('showcase')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <section ref={ref} className="cinema-hero" aria-labelledby="hero-title">
      <div className="cinema-hero__grid" aria-hidden="true" />
      <motion.div className="cinema-hero__glow" aria-hidden="true" style={reduce ? undefined : { y: ySlow }} />
      <motion.div className="cinema-hero__glow" aria-hidden="true" style={reduce ? undefined : { y: yFast, scale: 0.9, left: '72%' }} />
      <div className="cinema-hero__vignette" aria-hidden="true" />
      <motion.div className="cinema-scenery" aria-hidden="true" style={reduce ? undefined : { y: yFast }}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" focusable="false">
          <defs>
            <radialGradient id="cinema-planet-body" cx="38%" cy="34%" r="75%">
              <stop offset="0%" className="cinema-svg-stop-surface" />
              <stop offset="55%" className="cinema-svg-stop-card" />
              <stop offset="100%" className="cinema-svg-stop-bg" />
            </radialGradient>
            <radialGradient id="cinema-planet-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" className="cinema-svg-stop-halo" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="cinema-ridge-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="cinema-svg-stop-ridge" />
              <stop offset="100%" className="cinema-svg-stop-bg" />
            </linearGradient>
            <filter id="cinema-soft" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <filter id="cinema-tide-soft" x="-40%" y="-60%" width="180%" height="220%">
              <feGaussianBlur stdDeviation="28" />
            </filter>
          </defs>
          <g filter="url(#cinema-tide-soft)">
            <path
              d="M-160,560 C350,480 600,660 1000,560 S1350,500 1600,580"
              fill="none"
              className="cinema-svg-tide"
              strokeWidth="110"
            />
            <path
              d="M-160,710 C400,620 700,770 1100,685 S1400,640 1600,705"
              fill="none"
              className="cinema-svg-tide cinema-svg-tide--eve"
              strokeWidth="150"
            />
          </g>
          <g filter="url(#cinema-soft)">
            <path
              d="M-40,620 C250,560 350,680 600,610 S950,540 1200,600"
              fill="none"
              className="cinema-svg-wisp"
              strokeWidth="3"
            />
            <path
              d="M-40,690 C220,650 420,735 700,665 S1050,600 1440,675"
              fill="none"
              className="cinema-svg-wisp cinema-svg-wisp--eve"
              strokeWidth="2"
            />
            <path
              d="M80,300 C300,255 450,330 660,285"
              fill="none"
              className="cinema-svg-wisp cinema-svg-wisp--faint"
              strokeWidth="2"
            />
          </g>
          <circle cx="1360" cy="260" r="290" fill="url(#cinema-planet-halo)" className="cinema-svg-halo" />
          <circle cx="1360" cy="260" r="210" fill="url(#cinema-planet-body)" />
          <circle cx="1360" cy="260" r="210" fill="none" className="cinema-svg-planet-rim" strokeWidth="2" />
          <g filter="url(#cinema-soft)">
            <path
              d="M1225,421 A210,210 0 0 0 1225,99"
              fill="none"
              className="cinema-svg-crescent"
              strokeWidth="11"
            />
          </g>
          <path
            d="M1225,421 A210,210 0 0 0 1225,99"
            fill="none"
            className="cinema-svg-crescent cinema-svg-crescent--core"
            strokeWidth="2.5"
          />
          <circle cx="1310" cy="210" r="30" className="cinema-svg-crater" />
          <circle cx="1372" cy="328" r="19" className="cinema-svg-crater" />
          <circle cx="1332" cy="362" r="12" className="cinema-svg-crater" />
          <path
            d="M0,820 L120,740 L260,790 L400,710 L560,800 L720,730 L900,810 L1080,740 L1240,800 L1440,750 L1440,900 L0,900 Z"
            fill="url(#cinema-ridge-fade)"
          />
          <path
            d="M0,870 L180,810 L360,860 L540,800 L760,870 L950,815 L1150,865 L1300,830 L1440,860 L1440,900 L0,900 Z"
            className="cinema-svg-ridge-front"
          />
          <polyline
            points="0,870 180,810 360,860 540,800 760,870 950,815 1150,865 1300,830 1440,860"
            fill="none"
            className="cinema-svg-ridge-rim"
            strokeWidth="1.5"
          />
        </svg>
      </motion.div>

      <motion.div
        className="cinema-hero__inner"
        variants={reduce ? undefined : container}
        initial={reduce ? false : 'hidden'}
        animate={reduce ? undefined : 'show'}
        style={reduce ? undefined : { opacity, y: ySlow }}
      >
        <motion.div variants={reduce ? undefined : item} className="cinema-kicker" aria-label="Live workspace">
          <i aria-hidden="true" />
          Live workspace • Work indigo
          <Sparkles size={12} aria-hidden="true" className="cinema-kicker__spark" />
        </motion.div>

        <motion.h1 id="hero-title" className="cinema-title" variants={reduce ? undefined : item}>
          Your work and growth,
          <br />
          <span className="cinema-title__accent">finally in sync.</span>
        </motion.h1>

        <motion.p className="cinema-sub" variants={reduce ? undefined : item}>
          StarWaves brings <strong>tasks, calendars, coding contests, hackathons, projects, jobs, documents, mail, WhatsApp</strong> and{' '}
          <strong>Eve AI</strong> into one cinematic workspace — Work, Studio and Eve each lit in their own color, so flow never breaks.
        </motion.p>

        <motion.div className="cinema-hero__ctas" variants={reduce ? undefined : item}>
          <button type="button" className="cinema-cta cinema-cta--primary cinema-cta--hero" onClick={() => onNavigate('/signup')}>
            Start your workspace <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button type="button" className="cinema-cta cinema-cta--ghost cinema-cta--hero" onClick={scrollToShowcase}>
            <Play size={16} aria-hidden="true" /> Watch the reel
          </button>
        </motion.div>

        <motion.div className="cinema-hero__proof" variants={reduce ? undefined : item} aria-label="Trusted workflows">
          {['Board → Calendar → List', 'ICS + Google sync', 'Monaco inside', 'Eve is workspace-aware'].map((t) => (
            <span key={t} className="cinema-chip">
              <Check size={14} aria-hidden="true" /> {t}
            </span>
          ))}
        </motion.div>

        <motion.div
          className="cinema-stage"
          variants={reduce ? undefined : item}
          aria-hidden="true"
          animate={reduce ? undefined : { y: [0, -6, 0] }}
          transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="cinema-stage__glow" />
          <div className="cinema-frame">
            <div className="cinema-frame__top">
              <span className="cinema-dots">
                <i />
                <i />
                <i />
              </span>
              <span>starwaves.app — command center • Live</span>
              <span className="cinema-frame__live">● synced</span>
            </div>
            <div className="cinema-frame__body">
              <div className="cinema-kpis">
                <div className="cinema-kpi cinema-kpi--accent">
                  <small>Today</small>
                  <strong>5 open • 2 done</strong>
                  <span>Next up: Codeforces 14:35 UTC</span>
                </div>
                <div className="cinema-kpi cinema-kpi--growth">
                  <small>Pipeline</small>
                  <strong>3 interviewing • 1 offer</strong>
                  <span>Stripe • Anthropic • Vercel</span>
                </div>
                <div className="cinema-kpi cinema-kpi--workspace">
                  <small>Workspace</small>
                  <strong>starwaves/src/app.js</strong>
                  <span>Monaco • Eve can edit this file</span>
                </div>
              </div>
              <div className="cinema-tasks">
                <div className="cinema-task">
                  <i>
                    <Check size={10} />
                  </i>
                  Review CF Round #980 solutions — <em className="cinema-task__done-label">done</em>
                </div>
                <div className="cinema-task">
                  <i />
                  Prepare architecture doc for StarWaves v2
                </div>
                <div className="cinema-task">
                  <i />
                  Submit application — Staff AI Engineer
                </div>
                <div className="cinema-task done">
                  <i>
                    <Check size={10} />
                  </i>
                  Ship Eve schedule: call every Mon 9am
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.button
        type="button"
        className="cinema-scroll"
        onClick={scrollToShowcase}
        aria-label="Scroll to showcase"
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? {} : { opacity: 1 }}
        transition={reduce ? {} : { delay: 1.2, duration: 0.6 }}
      >
        Scroll to explore <ChevronDown size={16} aria-hidden="true" />
      </motion.button>
    </section>
  )
}
