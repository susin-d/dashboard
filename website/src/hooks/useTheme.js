import { useEffect, useState } from 'react'

export function useTheme() {
  const [darkTheme, setDarkTheme] = useState(
    () => localStorage.getItem('starwaves.theme') === 'dark',
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark-theme', darkTheme)
    localStorage.setItem('starwaves.theme', darkTheme ? 'dark' : 'light')
  }, [darkTheme])

  const toggleTheme = () => setDarkTheme((prev) => !prev)

  return { darkTheme, setDarkTheme, toggleTheme }
}
