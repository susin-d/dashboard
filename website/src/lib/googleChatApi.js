import { getStoredAuthToken } from './authApi'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function request(path, options = {}) {
  const token = getStoredAuthToken()
  if (!token) throw new Error('Sign in to connect Google Chat.')
  const response = await fetch(`${API_URL}/integrations/google-chat${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'Google Chat service unavailable.')
  }
  return response.status === 204 ? null : response.json()
}

export async function beginGoogleChatOAuth() {
  const data = await request('/authorize')
  if (data?.url) {
    window.location.href = data.url
  } else {
    throw new Error('Could not initiate Google Chat OAuth authorization.')
  }
}

export function getGoogleChatAccounts() {
  return request('/accounts')
}

export function saveGoogleChatAccount(accessToken) {
  return request('/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken }),
  })
}

export function disconnectGoogleChatAccount(accountId) {
  return request(`/accounts/${encodeURIComponent(accountId)}`, {
    method: 'DELETE',
  })
}

export function getGoogleChatSpaces(accountEmail) {
  const query = accountEmail ? `?account_email=${encodeURIComponent(accountEmail)}` : ''
  return request(`/spaces${query}`)
}

export function sendGoogleChatMessage(spaceId, text, accountEmail) {
  return request('/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      space_id: spaceId,
      text,
      account_email: accountEmail,
    }),
  })
}
