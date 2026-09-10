export const routeTitles = {
  '/': 'StarWaves — Developer productivity workspace',
  '/login': 'Log in — StarWaves',
  '/signup': 'Create account — StarWaves',
  '/forgot-password': 'Forgot password — StarWaves',
  '/onboarding': 'Set up your workspace — StarWaves',
  '/privacy': 'Privacy policy — StarWaves',
  '/terms': 'Terms of service — StarWaves',
}

export function detectNativeApp() {
  try {
    if (typeof window !== 'undefined') {
      if (window.Capacitor?.isNativePlatform?.() && window.Capacitor.isNativePlatform()) return true
      if (window.__TAURI__) return true
      if (navigator.userAgent.includes('Capacitor') || navigator.userAgent.includes('Tauri')) return true
      if (window.location.protocol === 'capacitor:' || window.location.protocol === 'tauri:') return true
    }
  } catch {}
  return false
}

export function parseResetToken() {
  const hash = window.location.hash || ''
  const search = window.location.search || ''
  const full = hash + search
  if (full.includes('reset-token=')) {
    const val = full.split('reset-token=')[1] || ''
    return decodeURIComponent(val.split('&')[0] || '').trim() || null
  }
  if (full.includes('reset_token=')) {
    const val = full.split('reset_token=')[1] || ''
    return decodeURIComponent(val.split('&')[0] || '').trim() || null
  }
  if (search.includes('token=')) {
    const val = search.split('token=')[1] || ''
    return decodeURIComponent(val.split('&')[0] || '').trim() || null
  }
  return null
}

export function buildUserProfile(activeUser) {
  if (!activeUser) return null
  const fullName =
    activeUser.displayName?.trim() ||
    activeUser.email?.split('@')[0] ||
    'StarWaves user'
  const nameParts = fullName.split(/\s+/).filter(Boolean)
  const isGoogle = Boolean(
    activeUser.providerData?.some(
      ({ providerId }) => providerId === 'google.com',
    ) || activeUser.google_auth
  )
  return {
    uid: activeUser.uid,
    fullName,
    firstName: nameParts[0],
    initials: nameParts.slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
    email: activeUser.email ?? 'No email available',
    emailVerified: Boolean(activeUser.emailVerified || activeUser.email_verified || isGoogle),
    role: 'Member',
    roleLabel: isGoogle ? 'Google account' : 'Email account',
    photoURL: activeUser.photoURL || activeUser.photoUrl || activeUser.photo_url || activeUser.avatar_url || activeUser.picture || null,
  }
}

export function resolveLayoutPage(activePage) {
  if (activePage === 'project-detail') return 'projects'
  if (activePage === 'hackathon-detail') return 'hackathons'
  if (activePage === 'document-opener') return 'documents'
  if (activePage === 'studio-detail') return 'studio'
  if (activePage === 'eve-sessions' || activePage === 'eve-memory' || activePage === 'eve-call' || activePage === 'eve-schedules') return 'eve'
  if (activePage === 'stats' || activePage === 'competitive-coding') return 'compete'
  return activePage
}
