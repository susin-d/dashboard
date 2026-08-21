import { useEffect } from 'react'

export function useScrollReveal() {
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
    }, 100)
    return () => {
      clearTimeout(timer)
      io.disconnect()
    }
  }, [])
}
