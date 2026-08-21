import { useEffect, useRef, useState } from 'react'
import { cinemaStats } from '../constants'

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
          const dur = 1700
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

  return <span ref={ref} className="stat-counter">{prefix}{val}{suffix}</span>
}

export function StatsSection() {
  return (
    <section className="landing-stats-ticker landing-stats-dark" aria-label="StarWaves at a glance">
      <div className="stats-ticker-grid">
        {cinemaStats.map(({ target, suffix, prefix, text, label, sub }) => (
          <div key={label} className="stat-ticker-item scroll-reveal">
            <strong>
              {target != null ? <AnimatedCounter target={target} suffix={suffix || ''} prefix={prefix || ''} /> : text}
            </strong>
            <div className="stat-ticker-info"><span>{label}</span><small>{sub}</small></div>
          </div>
        ))}
      </div>
    </section>
  )
}
