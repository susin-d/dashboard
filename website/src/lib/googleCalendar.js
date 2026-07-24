import { auth } from './firebase'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function request(path, options = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('Sign in to connect Google Calendar.')
  const token = await user.getIdToken()
  const response = await fetch(
    `${API_URL}/integrations/google-calendar${path}`,
    {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(
      failure?.detail || 'Google Calendar could not be connected.',
    )
  }
  return response.status === 204 ? null : response.json()
}

export async function beginGoogleCalendarOAuth() {
  const { url } = await request('/authorize')
  window.location.assign(url)
}

export function loadGoogleCalendarData() {
  return request('/data')
}

export function removeGoogleCalendarAccount(accountId) {
  return request(`/accounts/${encodeURIComponent(accountId)}`, {
    method: 'DELETE',
  })
}
