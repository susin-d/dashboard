import { getStoredAuthToken } from './authApi'
import { fetchWithTimeout } from './request'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

export async function sendEveMessage(messages) {
  const token = getStoredAuthToken()
  if (!token) throw new Error('Sign in to chat with Eve.')

  const response = await fetchWithTimeout(`${API_URL}/eve/chat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  }, 60_000)
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Eve endpoint not found (404). Please ensure the backend server at ${API_URL} is updated and running.`)
    }
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'Eve is unavailable right now.')
  }
  return response.json()
}

export async function deleteEveRecord(resource, recordId) {
  const token = getStoredAuthToken()
  if (!token) throw new Error('Sign in to use Eve delete.')

  const response = await fetchWithTimeout(`${API_URL}/eve/delete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource, record_id: recordId }),
  }, 30_000)
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Eve endpoint not found (404). Please ensure the backend server at ${API_URL} is updated and running.`)
    }
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'Eve could not delete that record.')
  }
  return response.json()
}
