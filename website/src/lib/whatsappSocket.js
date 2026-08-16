import { API_URL } from './request'
import { getStoredAuthToken } from './authApi'

const BACKOFF_INITIAL_MS = 500
const BACKOFF_MAX_MS = 30_000
const BACKOFF_FACTOR = 2

function buildWsUrl(token) {
  const base = API_URL.replace(/^http/, 'ws').replace(/\/api\/v1$/, '')
  return `${base}/ws/whatsapp?token=${encodeURIComponent(token)}`
}

class WhatsAppSocket {
  constructor() {
    this._ws = null
    this._handlers = new Set()
    this._backoffMs = BACKOFF_INITIAL_MS
    this._reconnectTimer = null
    this._subscribers = 0
    this._active = false

    this._handleVisibility = () => {
      if (document.visibilityState === 'visible' && this._active && !this._isOpen()) {
        this._clearReconnectTimer()
        this._connect()
      }
    }
  }

  subscribe(handler) {
    this._handlers.add(handler)
    this._subscribers += 1
    if (this._subscribers === 1) {
      this.connect()
    }
    return () => {
      this._handlers.delete(handler)
      this._subscribers = Math.max(0, this._subscribers - 1)
      if (this._subscribers === 0) {
        this.disconnect()
      }
    }
  }

  connect() {
    this._active = true
    document.addEventListener('visibilitychange', this._handleVisibility)
    this._connect()
  }

  disconnect() {
    this._active = false
    this._clearReconnectTimer()
    document.removeEventListener('visibilitychange', this._handleVisibility)
    if (this._ws) {
      this._ws.onclose = null
      this._ws.onerror = null
      this._ws.onmessage = null
      this._ws.close()
      this._ws = null
    }
  }

  send(data) {
    if (this._isOpen()) {
      this._ws.send(JSON.stringify(data))
    }
  }

  _isOpen() {
    return this._ws !== null && this._ws.readyState === WebSocket.OPEN
  }

  _connect() {
    if (this._isOpen() || !this._active) return

    const token = getStoredAuthToken()
    if (!token) {
      this._scheduleReconnect()
      return
    }

    try {
      const url = buildWsUrl(token)
      const ws = new WebSocket(url)
      this._ws = ws

      ws.onopen = () => {
        this._backoffMs = BACKOFF_INITIAL_MS
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === 'ping') {
            this.send({ type: 'pong' })
            return
          }
          this._dispatch(payload)
        } catch {
          // ignore non-JSON messages
        }
      }

      ws.onerror = () => {
        // Will trigger onclose
      }

      ws.onclose = () => {
        this._ws = null
        if (this._active) {
          this._scheduleReconnect()
        }
      }
    } catch {
      this._scheduleReconnect()
    }
  }

  _dispatch(event) {
    for (const handler of this._handlers) {
      try {
        handler(event)
      } catch (err) {
        console.error('WhatsApp socket handler error:', err)
      }
    }
  }

  _scheduleReconnect() {
    this._clearReconnectTimer()
    if (!this._active) return
    this._reconnectTimer = window.setTimeout(() => {
      this._backoffMs = Math.min(this._backoffMs * BACKOFF_FACTOR, BACKOFF_MAX_MS)
      this._connect()
    }, this._backoffMs)
  }

  _clearReconnectTimer() {
    if (this._reconnectTimer !== null) {
      window.clearTimeout(this._reconnectTimer)
      this._reconnectTimer = null
    }
  }
}

export const whatsappSocket = new WhatsAppSocket()
