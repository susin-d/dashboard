import { fetchWithTimeout } from './request'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'
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

async function request(path, options = {}, authenticated = false) {
  const headers = {}
  if (authenticated) {
    const token = getStoredAuthToken()
    if (!token) throw new Error('Sign in to continue.')
    headers.Authorization = `Bearer ${token}`
  }
  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  let response
  try {
    response = await fetchWithTimeout(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    })
  } catch (error) {
    throw new Error(
      error.message?.includes('Failed to fetch')
        ? 'Could not reach the StarWaves API. Start the backend server or set VITE_API_URL to a reachable API URL.'
        : error.message || 'Could not reach the StarWaves API.',
    )
  }

  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'Authentication request failed.')
  }

  return response.status === 204 ? null : response.json()
}

export async function signupWithEmail(email, password) {
  const result = await request(
    '/auth/signup',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    false,
  )
  setStoredAuthToken(result.token, result.user)
  return result.user
}

export async function loginWithEmail(email, password) {
  const result = await request(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    false,
  )
  setStoredAuthToken(result.token, result.user)
  return result.user
}

export async function requestPasswordReset(email) {
  return request(
    '/auth/forgot-password',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
    false,
  )
}

export async function verifyResetCode(email, code, token = '') {
  return request(
    '/auth/verify-reset-code',
    {
      method: 'POST',
      body: JSON.stringify({ email, code, token }),
    },
    false,
  )
}

export async function resetPassword(token, password) {
  return request(
    '/auth/reset-password',
    {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    },
    false,
  )
}

export async function deleteAccount() {
  return request('/auth/account', { method: 'DELETE' }, true)
}

export async function fetchCurrentUser() {
  const token = getStoredAuthToken()
  if (!token) return null
  try {
    const user = await request('/auth/me', { method: 'GET' }, true)
    setStoredAuthToken(token, user)
    return user
  } catch {
    clearAuthSession()
    return null
  }
}

export async function updateUserProfile(displayName) {
  const updatedUser = await request(
    '/auth/profile',
    {
      method: 'PATCH',
      body: JSON.stringify({ displayName }),
    },
    true,
  )
  const current = getStoredUser() || {}
  const newUser = { ...current, displayName: updatedUser.displayName }
  setStoredAuthToken(getStoredAuthToken(), newUser)
  return newUser
}

export async function beginGoogleOAuth() {
  const data = await request('/auth/google/login', { method: 'GET' }, false)
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

    if (!popup.opener) {
      popup.opener = window
    }

    if (popup.closed) {
      reject(new Error('Google sign-in was cancelled.'))
      return
    }

    const apiOrigin = new URL(API_URL).origin
    const messageHandler = (event) => {
      if (event.origin !== apiOrigin) return
      if (event.data?.type === 'STARWAVES_AUTH_SUCCESS' && event.data?.data) {
        window.removeEventListener('message', messageHandler)
        clearInterval(pollTimer)
        const { token, user } = event.data.data
        setStoredAuthToken(token, user)
        resolve(user)
      }
    }

    window.addEventListener('message', messageHandler)

    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer)
        window.removeEventListener('message', messageHandler)
        reject(new Error('Google sign-in was cancelled.'))
      }
    }, 500)
  })
}

export async function requestAccountCombine(targetEmail) {
  return request(
    '/auth/combine-account/request',
    {
      method: 'POST',
      body: JSON.stringify({ target_email: targetEmail }),
    },
    true,
  )
}

export async function verifyAccountCombine(token) {
  return request(
    '/auth/combine-account/verify',
    {
      method: 'POST',
      body: JSON.stringify({ token }),
    },
    false,
  )
}

export async function fetchCombinedAccounts() {
  return request('/auth/combine-account/list', { method: 'GET' }, true)
}

export async function unlinkCombinedAccount(targetIdentifier) {
  return request(
    `/auth/combine-account/unlink?target_identifier=${encodeURIComponent(targetIdentifier)}`,
    {
      method: 'DELETE',
    },
    true,
  )
}
