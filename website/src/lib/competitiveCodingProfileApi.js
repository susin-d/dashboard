import { getStoredAuthToken } from './authApi'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function request(options = {}) {
  const token = getStoredAuthToken()
  if (!token) throw new Error('Sign in to update competitive coding IDs.')
  const response = await fetch(`${API_URL}/settings/competitive-coding`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'Could not save competitive coding IDs.')
  }
  return response.json()
}

export function loadCompetitiveCodingProfile() {
  return request()
}

export function saveCompetitiveCodingProfile(profile) {
  return request({ method: 'PUT', body: JSON.stringify(profile) })
}
