import { getStoredAuthToken } from './authApi'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function request(path, options = {}) {
  const token = getStoredAuthToken()
  if (!token) throw new Error('Sign in to make calls.')
  const headers = { Authorization: `Bearer ${token}` }
  if (options.body) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_URL}/calls${path}`, {
    ...options,
    headers,
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'Call request failed.')
  }
  return response.status === 204 ? null : response.json()
}

export function createCall(calleeIdentifier, mode) {
  return request('', {
    method: 'POST',
    body: JSON.stringify({ callee_identifier: calleeIdentifier, mode }),
  })
}

export function getCall(callId) {
  return request(`/${callId}`)
}

export function updateCallStatus(callId, status) {
  return request(`/${callId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function sendCallSignal(callId, type, payload) {
  return request(`/${callId}/signals`, {
    method: 'POST',
    body: JSON.stringify({ type, payload }),
  })
}

export function getIncomingCalls() {
  return request('/incoming')
}

export function getRecentCalls() {
  return request('/recent')
}