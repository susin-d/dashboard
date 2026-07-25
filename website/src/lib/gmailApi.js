import { getStoredAuthToken } from './authApi'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function request(path, options = {}) {
  const token = getStoredAuthToken()
  if (!token) throw new Error('Sign in to connect Google Mail.')
  const response = await fetch(`${API_URL}/integrations/gmail${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'Google Mail is unavailable.')
  }
  return response.status === 204 ? null : response.json()
}

export function saveGmailConnection(accessToken) {
  return request('/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken }),
  })
}

export function getGmailStatus() {
  return request('/status')
}

export function getGmailToken(email = null) {
  const path = email ? `/token?email=${encodeURIComponent(email)}` : '/token'
  return request(path)
}

export function getGmailAccounts() {
  return request('/accounts')
}

export function disconnectGmailAccount(accountId) {
  return request(`/accounts/${encodeURIComponent(accountId)}`, {
    method: 'DELETE',
  })
}

export function disconnectGmail() {
  return request('', { method: 'DELETE' })
}
