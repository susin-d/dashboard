export function canNotify() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    window.Notification.permission === 'granted'
  )
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    throw new Error('Browser notifications are not supported in this browser.')
  }
  return window.Notification.requestPermission()
}

export function notify(title, body, tag = null) {
  if (!canNotify()) return false
  try {
    new window.Notification(title, { body, tag })
    return true
  } catch {
    return false
  }
}
