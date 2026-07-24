import { auth } from './firebase'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function request(path, options = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('Sign in to connect Google Mail.')
  const token = await user.getIdToken()
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
  return request('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken }),
  })
}

export function getGmailStatus() {
  return request('/status')
}

export function disconnectGmail() {
  return request('', { method: 'DELETE' })
}
