import { useEffect, useRef } from 'react'

export function StarFieldCanvas() {
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
      const n = Math.min(Math.floor((w * h) / 1500), 560)
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.2 + 0.25,
        vx: (Math.random() - 0.5) * 0.11,
        vy: (Math.random() - 0.5) * 0.07,
        o: Math.random() * 0.45 + 0.14,
        ts: Math.random() * 0.005 + 0.002,
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
