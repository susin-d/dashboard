import { getStoredAuthToken } from './authApi'
import { fetchWithTimeout } from './request'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function eveFetch(path, options = {}, timeoutMs = 30_000) {
  const token = getStoredAuthToken()
  if (!token) throw new Error('Sign in to use Eve.')
  const response = await fetchWithTimeout(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  }, timeoutMs)
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Eve endpoint not found (404). Please ensure the backend server at ${API_URL} is updated and running.`)
    }
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'Eve is unavailable right now.')
  }
  return response.status === 204 ? null : response.json()
}

export async function sendEveMessage(messages, sessionId) {
  return eveFetch('/eve/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, session_id: sessionId ?? null }),
  }, 60_000)
}

export async function listEveSessions() {
  return eveFetch('/eve/sessions')
}

export async function createEveSession(messages) {
  return eveFetch('/eve/sessions', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  })
}

export async function getEveSession(sessionId) {
  return eveFetch(`/eve/sessions/${encodeURIComponent(sessionId)}`)
}

export async function deleteEveSession(sessionId) {
  return eveFetch(`/eve/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  })
}

export async function deleteEveRecord(resource, recordId) {
  return eveFetch('/eve/delete', {
    method: 'POST',
    body: JSON.stringify({ resource, record_id: recordId }),
  })
}

export async function listEveMemories() {
  return eveFetch('/eve/memories')
}

export async function createEveMemory(content) {
  return eveFetch('/eve/memories', {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function deleteEveMemory(memoryId) {
  return eveFetch(`/eve/memories/${encodeURIComponent(memoryId)}`, {
    method: 'DELETE',
  })
}
