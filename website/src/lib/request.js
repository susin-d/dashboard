import { getStoredAuthToken } from './authApi'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal,
    })
  } catch (error) {
    if (error.name === 'AbortError' && !options.signal?.aborted) {
      throw new Error('The server took too long to respond. Please try again.')
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export async function apiRequest(
  path = '',
  {
    basePath = '',
    authRequired = true,
    errorMessage = 'The request could not be completed.',
    missingTokenMessage = 'Sign in to continue.',
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    notFoundMessage = null,
    onFetchError = null,
    ...fetchOptions
  } = {},
) {
  const headers = {}
  if (authRequired) {
    const token = getStoredAuthToken()
    if (!token) throw new Error(missingTokenMessage)
    headers.Authorization = `Bearer ${token}`
  }
  if (fetchOptions.body) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetchWithTimeout(`${API_URL}${basePath}${path}`, {
      ...fetchOptions,
      headers: { ...headers, ...fetchOptions.headers },
    }, timeoutMs)
  } catch (error) {
    if (onFetchError) throw onFetchError(error)
    throw error
  }

  if (!response.ok) {
    if (notFoundMessage && response.status === 404) {
      throw new Error(notFoundMessage)
    }
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || errorMessage)
  }
  return response.status === 204 ? null : response.json()
}
