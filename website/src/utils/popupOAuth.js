/**
 * Opens an OAuth authorization URL in a centered popup window and waits for
 * completion or popup closure.
 *
 * @param {string} url - The OAuth authorization URL to open in the popup window.
 * @param {string} title - Title/name for the popup window.
 * @returns {Promise<void>} Resolves when the popup closes or signals success.
 */
export function openOAuthPopup(url, title = 'google-oauth-popup') {
  return new Promise((resolve, reject) => {
    const width = 500
    const height = 650
    const left = window.screenX + (window.innerWidth - width) / 2
    const top = window.screenY + (window.innerHeight - height) / 2

    const popup = window.open(
      url,
      title,
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`,
    )

    if (!popup) {
      reject(new Error('Popup window was blocked by browser. Please allow popups for this site.'))
      return
    }

    let isDone = false
    let pollTimer = null

    const cleanup = () => {
      isDone = true
      if (pollTimer) clearInterval(pollTimer)
      window.removeEventListener('message', handleMessage)
    }

    const handleMessage = (event) => {
      if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.type === 'STARWAVES_OAUTH_CALLBACK'
      ) {
        cleanup()
        if (event.data.status === 'error') {
          reject(new Error(event.data.error || 'OAuth authorization failed.'))
        } else {
          resolve(event.data)
        }
      }
    }

    window.addEventListener('message', handleMessage)

    pollTimer = setInterval(() => {
      if (isDone) return
      let closed = false
      try {
        closed = Boolean(popup && popup.closed)
      } catch {
        // Cross-Origin-Opener-Policy (COOP) can throw a SecurityError / DOMException
        // when checking popup.closed while popup is on an external domain (e.g. accounts.google.com).
        // Catching the exception avoids console spam while polling continues.
        closed = false
      }

      if (closed) {
        cleanup()
        resolve()
      }
    }, 500)
  })
}

