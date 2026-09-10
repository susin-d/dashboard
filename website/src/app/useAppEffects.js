import { useEffect } from 'react'
import { confirmEmailVerification } from '../lib/emailApi'
import { verifyAccountCombine } from '../lib/authApi'
import { CUSTOM_THEME_KEY, THEME_MODE_KEY } from '../lib/storageKeys'
import { applyThemeVariables } from '../themes/themeApplicator'
import { routeTitles } from './appUtils'

export function useAppTitle({ activePage, route, previousRouteRef }) {
  useEffect(() => {
    const pageName = activePage
      .split('-')
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' ')
    document.title = routeTitles[route] ?? `${pageName} — StarWaves`

    if (previousRouteRef.current !== route) {
      window.requestAnimationFrame(() => {
        const main = document.getElementById('main-content')
        main?.focus({ preventScroll: true })
      })
      previousRouteRef.current = route
    }
  }, [activePage, route, previousRouteRef])
}

export function useAccountDeepLinks({ setSessionUser, setWorkspaceRefreshKey }) {
  useEffect(() => {
    const hash = window.location.hash || ''
    if (hash.includes('#combine-account?token=')) {
      const token = decodeURIComponent(hash.split('#combine-account?token=')[1] || '').trim()
      if (token) {
        verifyAccountCombine(token)
          .then((res) => {
            alert(res.message || 'Account verification successful! Accounts combined.')
            window.history.replaceState({}, '', window.location.pathname + window.location.search)
            setWorkspaceRefreshKey((prev) => prev + 1)
          })
          .catch((err) => {
            alert(err.message || 'Account combination link invalid or expired.')
            window.history.replaceState({}, '', window.location.pathname + window.location.search)
          })
      }
    } else if (hash.includes('#verify-email?token=')) {
      const token = decodeURIComponent(hash.split('#verify-email?token=')[1] || '').trim()
      if (token) {
        confirmEmailVerification(token)
          .then((res) => {
            alert(res.message || 'Email address verified successfully!')
            window.history.replaceState({}, '', window.location.pathname + window.location.search)
            setSessionUser((current) => (current ? { ...current, emailVerified: true } : null))
            setWorkspaceRefreshKey((prev) => prev + 1)
          })
          .catch((err) => {
            alert(err.message || 'Verification link invalid or expired.')
            window.history.replaceState({}, '', window.location.pathname + window.location.search)
          })
      }
    }
  }, [setSessionUser, setWorkspaceRefreshKey])
}

export function useAppTheme() {
  useEffect(() => {
    const savedTheme = localStorage.getItem(CUSTOM_THEME_KEY)
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme)
        if (parsed && typeof parsed === 'object') {
          applyThemeVariables(parsed)
          return
        }
      } catch (err) {
        console.error('Could not load custom theme:', err)
      }
    }
    const stored = localStorage.getItem(THEME_MODE_KEY)
    if (stored === 'light') {
      applyThemeVariables({ preset: 'light', mode: 'light' })
    }
  }, [])
}

export function useAuthRedirects({ authReady, activeUser, resetToken, route, setRoute, setActivePage, setSelectedProjectId }) {
  useEffect(() => {
    if (
      authReady &&
      activeUser &&
      !resetToken &&
      (route === '/' || route === '/login' || route === '/signup' || route === '/forgot-password' || route === '/auth')
    ) {
      window.history.replaceState({}, '', '/app/dashboard')
      setRoute('/app/dashboard')
      setActivePage('dashboard')
      setSelectedProjectId(null)
    }
  }, [authReady, activeUser, route, setRoute, setActivePage, setSelectedProjectId, resetToken])

  useEffect(() => {
    if (route === '/app') {
      window.history.replaceState({}, '', '/app/dashboard')
      setRoute('/app/dashboard')
      setActivePage('dashboard')
    }
    if (route === '/app/competitive') {
      window.history.replaceState({}, '', '/app/competitive-coding')
      setRoute('/app/competitive-coding')
      setActivePage('competitive-coding')
    }
  }, [route, setRoute, setActivePage])
}

export function useSessionEvents({ setSessionUser, setWorkspaceRefreshKey, clearAuthSession }) {
  useEffect(() => {
    const onRevoked = () => {
      clearAuthSession()
      setSessionUser(null)
      window.history.pushState({}, '', '/login')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
    window.addEventListener('starwaves:session-revoked', onRevoked)
    const onSync = () => setWorkspaceRefreshKey((k) => k + 1)
    window.addEventListener('starwaves:sync-invalidate', onSync)
    return () => {
      window.removeEventListener('starwaves:session-revoked', onRevoked)
      window.removeEventListener('starwaves:sync-invalidate', onSync)
    }
  }, [setSessionUser, setWorkspaceRefreshKey, clearAuthSession])
}
