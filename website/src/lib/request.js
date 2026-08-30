import { getDeviceId, getDeviceName, getStoredAuthToken } from './authApi'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000

// Lightweight dedup + cache for GET on e2-micro single worker (reduces thundering herd)
// Default policy: cache GETs for 30s unless caller opts out with useCache:false or useCacheTtl:0
const pendingRequests = new Map()
const getCache = new Map() // key -> { expires, data }
const DEFAULT_GET_CACHE_TTL_MS = 30_000
const GET_CACHE_MAX_SIZE = 150

// Per-path TTL overrides (ms) — longer for slowly changing prefs, shorter for volatile lists
const CACHE_TTL_OVERRIDES = [
  { match: (p) => p.includes('/ui/preferences'), ttl: 120_000 },
  { match: (p) => p.includes('/auth/me'), ttl: 60_000 },
  { match: (p) => p.includes('/auth/sessions'), ttl: 0 }, // always live
  { match: (p) => p.includes('/usage/'), ttl: 15_000 },
  { match: (p) => p.includes('/eve/sessions') || p.includes('/eve/memories'), ttl: 15_000 },
  { match: (p) => p.includes('/settings/ai-models'), ttl: 60_000 },
]

function resolveCacheTtl(path, explicitTtl) {
  if (typeof explicitTtl === 'number') return explicitTtl
  for (const o of CACHE_TTL_OVERRIDES) if (o.match(path)) return o.ttl
  return DEFAULT_GET_CACHE_TTL_MS
}

function cacheKey(method, url) {
  return `${method}:${url}`
}

function shouldCacheGet(path, useCache, useCacheTtl, method) {
  if (method !== 'GET') return false
  if (useCache === false) return false
  if (typeof useCacheTtl === 'number' && useCacheTtl === 0) return false
  const ttl = resolveCacheTtl(path, useCacheTtl)
  return ttl > 0
}

function getTtlForPath(path, useCacheTtl) {
  return resolveCacheTtl(path, useCacheTtl)
}

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
    retries = 0,
    useCache = undefined,
    useCacheTtl = undefined,
    ...fetchOptions
  } = {},
) {
  const method = (fetchOptions.method || 'GET').toUpperCase()
  const fullUrl = `${API_URL}${basePath}${path}`
  const dedupKey = cacheKey(method, fullUrl + JSON.stringify(fetchOptions.body || ''))
  const effectiveUseCache = shouldCacheGet(path, useCache, useCacheTtl, method)

  // GET cache for idempotent reads — reduces e2-micro load & spam
  if (effectiveUseCache && !fetchOptions.body) {
    const cached = getCache.get(dedupKey)
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }
  }

  // Dedup concurrent identical GETs
  if (method === 'GET' && pendingRequests.has(dedupKey)) {
    return pendingRequests.get(dedupKey)
  }

  const headers = {}
  if (authRequired) {
    const token = getStoredAuthToken()
    if (!token) throw new Error(missingTokenMessage)
    headers.Authorization = `Bearer ${token}`
  }
  // Multi-device: identify device for session creation & per-device metrics
  try {
    headers['X-Device-Id'] = getDeviceId()
    headers['X-Device-Name'] = getDeviceName()
  } catch {
    // ignore storage access errors (private mode)
  }
  if (fetchOptions.body) headers['Content-Type'] = 'application/json'

  const exec = async (attempt = 0) => {
    let response
    try {
      response = await fetchWithTimeout(fullUrl, {
        ...fetchOptions,
        headers: { ...headers, ...fetchOptions.headers },
      }, timeoutMs)
    } catch (error) {
      // Retry on timeout/network for transient e2-micro burst throttling
      if (attempt < retries && error.message?.includes('too long')) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
        return exec(attempt + 1)
      }
      if (onFetchError) throw onFetchError(error)
      throw error
    }

    if (!response.ok) {
      // Retry on 429/502/503 with backoff
      if (attempt < retries && [429, 502, 503].includes(response.status)) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '0', 10)
        const delay = retryAfter ? retryAfter * 1000 : 400 * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
        return exec(attempt + 1)
      }
      if (notFoundMessage && response.status === 404) {
        throw new Error(notFoundMessage)
      }
      let failure = null
      try {
        failure = await response.json()
      } catch {
        // response was not valid JSON (e.g. HTML error page)
      }
      // Multi-device: revoked/expired token → force sign out so other device sees 401
      if (response.status === 401 && authRequired) {
        try {
          const { clearAuthSession } = await import('./authApi')
          clearAuthSession()
          window.dispatchEvent(new CustomEvent('starwaves:session-revoked'))
        } catch {}
      }
      throw Object.assign(new Error(failure?.detail || errorMessage), { status: response.status })
    }
    if (response.status === 204) return null
    try {
      const data = await response.json()
      if (effectiveUseCache) {
        const ttl = getTtlForPath(path, useCacheTtl)
        getCache.set(dedupKey, { data, expires: Date.now() + ttl })
        // Bound cache size (LRU-ish: drop oldest)
        if (getCache.size > GET_CACHE_MAX_SIZE) {
          const firstKey = getCache.keys().next().value
          getCache.delete(firstKey)
        }
      }
      return data
    } catch {
      throw new Error('Received an invalid response from the server.')
    }
  }

  const promise = exec()
  if (method === 'GET') {
    pendingRequests.set(dedupKey, promise)
    promise.finally(() => pendingRequests.delete(dedupKey))
  }
  return promise
}

export function clearRequestCache() {
  getCache.clear()
  pendingRequests.clear()
}

export function invalidateRequestCache(predicate) {
  for (const key of getCache.keys()) {
    if (predicate(key)) getCache.delete(key)
  }
}

export function invalidateCacheForPath(pathFragment) {
  invalidateRequestCache((key) => key.includes(pathFragment))
}
