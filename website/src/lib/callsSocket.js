/**
 * WebSocket client for real-time call signaling.
 *
 * Opens a single persistent connection to /ws/calls, authenticates via the
 * stored Starwaves auth token, and dispatches server-pushed events to
 * registered message handlers.
 *
 * Auto-reconnects with exponential back-off (500 ms → 1 s → 2 s → … cap 30 s)
 * and pauses reconnect attempts while the tab is hidden.
 */

import { API_URL } from './request'
import { getStoredAuthToken } from './authApi'

const BACKOFF_INITIAL_MS = 500
const BACKOFF_MAX_MS = 30_000
const BACKOFF_FACTOR = 2

function buildWsUrl(token) {
  // Convert http(s):// → ws(s):// and strip the /api/v1 suffix — the WS
  // endpoint lives at /ws/calls directly on the server.
  const base = API_URL.replace(/^http/, 'ws').replace(/\/api\/v1$/, '')
  return `${base}/ws/calls?token=${encodeURIComponent(token)}`
}

class CallsSocket {
  constructor() {
    this._ws = null
    this._handlers = new Set()
    this._backoffMs = BACKOFF_INITIAL_MS
    this._reconnectTimer = null
    this._active = false

    this._handleVisibility = () => {
      if (document.visibilityState === 'visible' && this._active && !this._isOpen()) {
        this._clearReconnectTimer()
        this._connect()
      }
    }
  }

  /** Start the connection and keep it alive until disconnect() is called. */
  connect() {
    if (this._active) return
    this._active = true
    document.addEventListener('visibilitychange', this._handleVisibility)
    this._connect()
  }

  /** Stop the connection and cancel any pending reconnect. */
  disconnect() {
    this._active = false
    document.removeEventListener('visibilitychange', this._handleVisibility)
    this._clearReconnectTimer()
    if (this._ws) {
      this._ws.onclose = null
      this._ws.close()
      this._ws = null
    }
  }

  /** Register a handler for incoming server events. Returns an unsubscribe fn. */
  onMessage(handler) {
    this._handlers.add(handler)
    return () => this._handlers.delete(handler)
  }

  _isOpen() {
    return this._ws?.readyState === WebSocket.OPEN
  }

  _connect() {
    const token = getStoredAuthToken()
    if (!token || !this._active) return

    const ws = new WebSocket(buildWsUrl(token))
    this._ws = ws

    ws.onopen = () => {
      this._backoffMs = BACKOFF_INITIAL_MS
    }

    ws.onmessage = (event) => {
      let data
      try {
        data = JSON.parse(event.data)
      } catch {
        return
      }
      if (data.type === 'ping') return
      for (const handler of this._handlers) {
        try {
          handler(data)
        } catch {
          // Never let one handler break others.
        }
      }
    }

    ws.onerror = () => {
      // onerror is always followed by onclose; let onclose handle reconnect.
    }

    ws.onclose = () => {
      this._ws = null
      if (!this._active) return
      if (document.visibilityState === 'hidden') {
        // Defer reconnect until the tab is visible again.
        return
      }
      this._scheduleReconnect()
    }
  }

  _scheduleReconnect() {
    this._clearReconnectTimer()
    this._reconnectTimer = window.setTimeout(() => {
      this._reconnectTimer = null
      if (this._active && !this._isOpen()) {
        this._connect()
      }
    }, this._backoffMs)
    this._backoffMs = Math.min(this._backoffMs * BACKOFF_FACTOR, BACKOFF_MAX_MS)
  }

  _clearReconnectTimer() {
    if (this._reconnectTimer !== null) {
      window.clearTimeout(this._reconnectTimer)
      this._reconnectTimer = null
    }
  }
}

export const callsSocket = new CallsSocket()
