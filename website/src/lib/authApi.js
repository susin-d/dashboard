import { API_URL, apiRequest } from './request'

const TOKEN_KEY = 'starwaves_auth_token'
const USER_KEY = 'starwaves_auth_user'

export function getStoredAuthToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredAuthToken(token, user = null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } else if (user === null) {
    localStorage.removeItem(USER_KEY)
  }
  window.dispatchEvent(new Event('starwaves:auth-change'))
}

export function getStoredUser() {
  try {
    const data = localStorage.getItem(USER_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.dispatchEvent(new Event('starwaves:auth-change'))
}

export function consumeAuthTokenFromHash() {
  const hash = window.location.hash || ''
  if (!hash.startsWith('#token=')) return false

  const token = decodeURIComponent(hash.slice('#token='.length)).trim()
  if (!token) return false

  setStoredAuthToken(token, undefined)
  window.history.replaceState({}, '', window.location.pathname + window.location.search)
  return true
}

function request(path, options = {}) {
  return apiRequest(path, {
    errorMessage: 'Authentication request failed.',
    missingTokenMessage: 'Sign in to continue.',
    onFetchError: (error) =>
      new Error(
        error.message?.includes('Failed to fetch')
          ? 'Could not reach the StarWaves API. Start the backend server or set VITE_API_URL to a reachable API URL.'
          : error.message || 'Could not reach the StarWaves API.',
      ),
    ...options,
  })
}

export async function signupWithEmail(email, password) {
  const result = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    authRequired: false,
  })
  setStoredAuthToken(result.token, result.user)
  return result.user
}

export async function loginWithEmail(email, password) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    authRequired: false,
  })
  setStoredAuthToken(result.token, result.user)
  return result.user
}

export function requestPasswordReset(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    authRequired: false,
  })
}

export function verifyResetCode(email, code, token = '') {
  return request('/auth/verify-reset-code', {
    method: 'POST',
    body: JSON.stringify({ email, code, token }),
    authRequired: false,
  })
}

export function resetPassword(token, password) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
    authRequired: false,
  })
}

export function deleteAccount() {
  return request('/auth/account', { method: 'DELETE' })
}

export async function fetchCurrentUser() {
  const token = getStoredAuthToken()
  if (!token) return null
  try {
    const user = await request('/auth/me')
    setStoredAuthToken(token, user)
    return user
  } catch {
    clearAuthSession()
    return null
  }
}

export async function updateUserProfile(displayName) {
  const updatedUser = await request('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  })
  const current = getStoredUser() || {}
  const newUser = { ...current, displayName: updatedUser.displayName }
  setStoredAuthToken(getStoredAuthToken(), newUser)
  return newUser
}

export async function beginGoogleOAuth() {
  const data = await request('/auth/google/login', { authRequired: false })
  if (!data?.url) throw new Error('Could not initiate Google authentication.')

  const isNativeCapacitor = Boolean(window.Capacitor?.isNativePlatform?.())
  const shouldRedirectForOAuth =
    isNativeCapacitor ||
    window.matchMedia('(max-width: 768px), (pointer: coarse)').matches

  if (shouldRedirectForOAuth) {
    window.location.assign(data.url)
    return new Promise(() => {})
  }

  return new Promise((resolve, reject) => {
    const width = 500
    const height = 600
    const left = window.screenX + (window.innerWidth - width) / 2
    const top = window.screenY + (window.innerHeight - height) / 2

    const popup = window.open(
      data.url,
      'google-auth-popup',
      `width=${width},height=${height},top=${top},left=${left}`,
    )

    if (!popup) {
      window.location.assign(data.url)
      return
    }

    let isDone = false
    let broadcastChannel = null

    const cleanup = () => {
      isDone = true
      window.removeEventListener('message', messageHandler)
      window.removeEventListener('storage', storageHandler)
      window.removeEventListener('focus', focusHandler)
      if (broadcastChannel) {
        try {
          broadcastChannel.close()
        } catch {}
      }
    }

    const processAuthSuccess = (userData, token) => {
      if (isDone) return
      cleanup()
      setStoredAuthToken(token, userData)
      resolve(userData)
    }

    const isAllowedAuthOrigin = (origin) => {
      if (!origin) return false
      if (typeof window === 'undefined') return true
      if (origin === window.location.origin) return true
      if (API_URL.startsWith('http')) {
        try {
          if (new URL(API_URL).origin === origin) return true
        } catch {}
      }
      const isLocalHost = (host) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
      try {
        const originHost = new URL(origin).host
        const winHost = window.location.host
        if (isLocalHost(originHost) && isLocalHost(winHost)) {
          return true
        }
      } catch {}
      if (origin.endsWith('.susindran.in') || origin.endsWith('.vercel.app')) {
        return true
      }
      return false
    }

    const messageHandler = (event) => {
      if (!isAllowedAuthOrigin(event.origin)) return
      if (event.data?.type === 'STARWAVES_AUTH_SUCCESS' && event.data?.data) {
        const { token, user } = event.data.data
        processAuthSuccess(user, token)
      }
    }

    const storageHandler = (event) => {
      if (event.key === 'starwaves_auth_sync' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue)
          if (parsed?.type === 'STARWAVES_AUTH_SUCCESS' && parsed?.data) {
            const { token, user } = parsed.data
            processAuthSuccess(user, token)
          }
        } catch {}
      }
    }

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel('starwaves_auth')
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'STARWAVES_AUTH_SUCCESS' && event.data?.data) {
            const { token, user } = event.data.data
            processAuthSuccess(user, token)
          }
        }
      } catch {
        broadcastChannel = null
      }
    }

    const focusHandler = () => {
      if (isDone) return
      // When the main window regains focus, check if auth succeeded or if popup closed
      setTimeout(() => {
        if (isDone) return
        const storedUser = getStoredUser()
        if (storedUser && getStoredAuthToken()) {
          cleanup()
          resolve(storedUser)
          return
        }
        try {
          if (popup && popup.closed) {
            setTimeout(() => {
              if (isDone) return
              const recheckUser = getStoredUser()
              if (recheckUser && getStoredAuthToken()) {
                cleanup()
                resolve(recheckUser)
                return
              }
              cleanup()
              reject(new Error('Google sign-in was cancelled.'))
            }, 800)
          }
        } catch {
          // COOP restriction: safely ignore
        }
      }, 500)
    }

    window.addEventListener('message', messageHandler)
    window.addEventListener('storage', storageHandler)
    window.addEventListener('focus', focusHandler)
  })
}

export function requestAccountCombine(targetEmail) {
  return request('/auth/combine-account/request', {
    method: 'POST',
    body: JSON.stringify({ target_email: targetEmail }),
  })
}

export function verifyAccountCombine(token) {
  return request('/auth/combine-account/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
    authRequired: false,
  })
}

export function fetchCombinedAccounts() {
  return request('/auth/combine-account/list')
}

export function unlinkCombinedAccount(targetIdentifier) {
  return request(`/auth/combine-account/unlink?target_identifier=${encodeURIComponent(targetIdentifier)}`, {
    method: 'DELETE',
  })
}
