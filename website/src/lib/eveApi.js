import { apiRequest, API_URL } from './request'

const ERROR_MESSAGE = 'Eve is unavailable right now.'
const TOKEN_MESSAGE = 'Sign in to use Eve.'

function request(path, options = {}) {
  return apiRequest(path, {
    errorMessage: ERROR_MESSAGE,
    missingTokenMessage: TOKEN_MESSAGE,
    notFoundMessage: `Eve endpoint not found (404). Please ensure the backend server at ${API_URL} is updated and running.`,
    ...options,
  })
}

export function sendEveMessage(messages, sessionId) {
  return request('/eve/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, session_id: sessionId ?? null }),
    timeoutMs: 60_000,
  })
}

export function listEveSessions() {
  return request('/eve/sessions')
}

export function createEveSession(messages) {
  return request('/eve/sessions', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  })
}

export function getEveSession(sessionId) {
  return request(`/eve/sessions/${encodeURIComponent(sessionId)}`)
}

export function deleteEveSession(sessionId) {
  return request(`/eve/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' })
}

export function deleteEveRecord(resource, recordId) {
  return request('/eve/delete', {
    method: 'POST',
    body: JSON.stringify({ resource, record_id: recordId }),
  })
}

export function listEveMemories() {
  return request('/eve/memories')
}

export function createEveMemory(content) {
  return request('/eve/memories', {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export function deleteEveMemory(memoryId) {
  return request(`/eve/memories/${encodeURIComponent(memoryId)}`, { method: 'DELETE' })
}
