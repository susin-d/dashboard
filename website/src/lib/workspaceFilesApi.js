import { apiRequest } from './request'

const ERROR_MESSAGE = 'Workspace file operation failed.'
const TOKEN_MESSAGE = 'Sign in to access workspace files.'

function request(path = '', options = {}) {
  return apiRequest(`/workspace-files${path}`, {
    errorMessage: ERROR_MESSAGE,
    missingTokenMessage: TOKEN_MESSAGE,
    ...options,
  })
}

export async function loadFileTree() {
  const data = await request('/tree')
  return data?.files ?? []
}

export async function readFile(filePath) {
  return request(`/${filePath}`)
}

export async function writeFile(filePath, content, encoding = 'utf-8') {
  return request(`/${filePath}`, {
    method: 'PUT',
    body: JSON.stringify({ content, encoding }),
  })
}

export async function deleteFile(filePath) {
  return request(`/${filePath}`, { method: 'DELETE' })
}

export async function syncFiles(files) {
  return request('/sync', {
    method: 'POST',
    body: JSON.stringify({ files }),
  })
}
