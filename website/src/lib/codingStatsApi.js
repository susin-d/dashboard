import { auth } from './firebase'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

export async function loadPlatformCodingStats(platform) {
  const user = auth.currentUser
  if (!user) throw new Error('Sign in to load coding statistics.')
  const token = await user.getIdToken()
  const response = await fetch(
    `${API_URL}/stats/competitive-coding/${platform}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'Could not load coding statistics.')
  }
  return response.json()
}
