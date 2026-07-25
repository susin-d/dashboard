import { getStoredAuthToken } from './authApi'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function request(path, options = {}) {
  const token = getStoredAuthToken()
  if (!token) throw new Error('Sign in to connect GitHub.')
  const response = await fetch(`${API_URL}/integrations/github${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'GitHub could not be connected.')
  }
  return response.status === 204 ? null : response.json()
}

export function getGithubStatus() {
  return request('/status')
}

export async function beginGithubOAuth() {
  const { url } = await request('/authorize')
  window.location.assign(url)
}

export function loadGithubData() {
  return request('/data')
}

export function disconnectGithub() {
  return request('', { method: 'DELETE' })
}
