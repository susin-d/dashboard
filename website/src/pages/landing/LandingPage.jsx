import { useEffect, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { Nav } from './sections/Nav'
import { Hero } from './sections/Hero'
import { Manifesto } from './sections/Manifesto'
import { Showcase } from './sections/Showcase'
import { Eve } from './sections/Eve'
import { Features } from './sections/Features'
import { Workflow } from './sections/Workflow'
import { FAQ } from './sections/FAQ'
import { Finale, Footer } from './sections/Finale'
import './cinema.css'

export function LandingPage({ user, onNavigate }) {
  const reduce = useReducedMotion()
  const [curtain, setCurtain] = useState(!reduce)

  useEffect(() => {
    if (reduce) return undefined
    const t = setTimeout(() => setCurtain(false), 900)
    return () => clearTimeout(t)
  }, [reduce])

  // user prop is accepted for contract; all CTAs still go to /signup or /login per spec
  void user

  return (
    <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>
      <AnimatePresence>
        {curtain && (
          <motion.div
            aria-hidden="true"
            className="cinema-curtain"
            initial={{ y: 0 }}
            exit={{ y: '-100%', transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="cinema-curtain__inner"
            >
              <span className="cinema-curtain__mark" aria-hidden="true">
                S
              </span>
              <span className="cinema-curtain__word">STARWAVES</span>
              <span className="cinema-curtain__sub">Feature presentation</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main-content" className="cinema" tabIndex={-1} style={{ outline: 'none' }}>
        <Nav onNavigate={onNavigate} />
        <Hero onNavigate={onNavigate} />
        <Manifesto />
        <Showcase onNavigate={onNavigate} />
        <Eve onNavigate={onNavigate} />
        <Features />
        <Workflow />
        <FAQ />
        <Finale onNavigate={onNavigate} />
        <Footer onNavigate={onNavigate} />
      </main>
    </MotionConfig>
  )
}
