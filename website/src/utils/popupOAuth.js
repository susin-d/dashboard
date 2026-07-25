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

    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer)
        resolve()
      }
    }, 500)
  })
}
