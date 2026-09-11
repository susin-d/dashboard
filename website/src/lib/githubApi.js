import { apiRequest } from './request'

const BASE_PATH = '/integrations/github'
const ERROR_MESSAGE = 'GitHub could not be connected.'
const TOKEN_MESSAGE = 'Sign in to connect GitHub.'

function request(path, options = {}) {
  return apiRequest(path, {
    basePath: BASE_PATH,
    errorMessage: ERROR_MESSAGE,
    missingTokenMessage: TOKEN_MESSAGE,
    ...options,
  })
}

export function getGithubStatus() {
  return request('/status')
}

export async function beginGithubOAuth() {
  const { url } = await request('/authorize')
  window.location.assign(url)
}

export function loadGithubData(repositoryLimit = 100, includeStats = true) {
  const safeLimit = Math.max(1, Math.min(repositoryLimit, 100))
  return request(`/data?repository_limit=${safeLimit}&include_stats=${includeStats}`)
}

export function disconnectGithub() {
  return request('', { method: 'DELETE' })
}
