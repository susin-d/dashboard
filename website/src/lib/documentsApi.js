import { apiRequest } from './request'

const ERROR_MESSAGE = 'The documents database is unavailable.'
const TOKEN_MESSAGE = 'Sign in to access your documents.'

function authenticatedRequest(path, options = {}) {
  return apiRequest(path, {
    errorMessage: ERROR_MESSAGE,
    missingTokenMessage: TOKEN_MESSAGE,
    ...options,
  })
}

export function mapDocumentFromApi(document) {
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
  const items = Array.isArray(documents) ? documents : documents.items ?? []
  return items.map(mapDocumentFromApi)
}

export async function persistDocument(document) {
  const saved = await authenticatedRequest(
    `/documents/${encodeURIComponent(document.id)}`,
    { method: 'PUT', body: JSON.stringify(toApi(document)) },
  )
  return mapDocumentFromApi(saved)
}

export function deleteDocument(documentId) {
  return authenticatedRequest(`/documents/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
  })
}

