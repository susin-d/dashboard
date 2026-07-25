import { getStoredAuthToken } from './authApi'
import { openOAuthPopup } from '../utils/popupOAuth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function request(path, options = {}) {
  const token = getStoredAuthToken()
  if (!token) throw new Error('Sign in to connect Google Drive.')
  const response = await fetch(`${API_URL}/integrations/google-drive${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'Google Drive is unavailable.')
  }
  return response.status === 204 ? null : response.json()
}

export function getGoogleDriveStatus() {
  return request('/status')
}

export async function beginGoogleDriveOAuth() {
  const { url } = await request('/authorize')
  return openOAuthPopup(url, 'google-drive-oauth')
}

export function loadGoogleDriveFiles() {
  return request('/files')
}

export function uploadGoogleDriveFile(file) {
  return request('/upload', {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
      'X-File-Type': file.type || 'application/octet-stream',
    },
    body: file,
  })
}

export function disconnectGoogleDrive() {
  return request('', { method: 'DELETE' })
}
