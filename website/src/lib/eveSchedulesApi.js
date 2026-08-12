import { getStoredAuthToken } from './authApi'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function request(path, options = {}) {
  const token = getStoredAuthToken()
  if (!token) throw new Error('Sign in to manage Eve schedules.')
  const headers = { Authorization: `Bearer ${token}` }
  if (options.body) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_URL}/eve/schedules${path}`, {
    ...options,
    headers,
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'Eve schedule request failed.')
  }
  return response.status === 204 ? null : response.json()
}

export function listEveSchedules() {
  return request('')
}

export function createEveSchedule(payload) {
  return request('', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateEveSchedule(scheduleId, updates) {
  return request(`/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export function deleteEveSchedule(scheduleId) {
  return request(`/${scheduleId}`, {
    method: 'DELETE',
  })
}

export function runEveScheduleNow(scheduleId) {
  return request(`/${scheduleId}/run`, {
    method: 'POST',
  })
}
