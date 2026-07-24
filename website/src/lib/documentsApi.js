import { auth } from './firebase'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function authenticatedRequest(path, options = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('Sign in to access your documents.')
  const token = await user.getIdToken()
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'The documents database is unavailable.')
  }
  return response.status === 204 ? null : response.json()
}

function fromApi(document) {
  return {
    id: document.id,
    name: document.name,
    category: document.category,
    description: document.description,
    tags: document.tags,
    type: document.type,
    size: document.size,
    modifiedAt: document.modified_at,
    url: document.url,
    driveFileId: document.drive_file_id,
  }
}

function toApi(document) {
  return {
    name: document.name,
    category: document.category,
    description: document.description,
    tags: document.tags,
    type: document.type,
    size: document.size,
    modified_at: document.modifiedAt,
    url: document.url,
    drive_file_id: document.driveFileId ?? null,
  }
}

export async function loadDocuments() {
  const documents = await authenticatedRequest('/documents')
  return documents.map(fromApi)
}

export async function persistDocument(document) {
  const saved = await authenticatedRequest(
    `/documents/${encodeURIComponent(document.id)}`,
    { method: 'PUT', body: JSON.stringify(toApi(document)) },
  )
  return fromApi(saved)
}

export function deleteDocument(documentId) {
  return authenticatedRequest(`/documents/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
  })
}

