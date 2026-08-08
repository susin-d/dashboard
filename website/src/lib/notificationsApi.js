import { authFetch } from './authApi'

export async function registerDeviceToken(token, deviceName = null) {
  const response = await authFetch('/notifications/device-token', {
    method: 'POST',
    body: JSON.stringify({ token, device_name: deviceName }),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to register notification device token.')
  }
  return response.json()
}

export async function getRegisteredDevices() {
  const response = await authFetch('/notifications/devices')
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to fetch registered notification devices.')
  }
  return response.json()
}

export async function unregisterDeviceToken(tokenId) {
  const response = await authFetch(`/notifications/device-token/${tokenId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to unregister notification device token.')
  }
  return true
}

export async function sendPushNotification({ title, body, data = null, targetDeviceToken = null }) {
  const response = await authFetch('/notifications/send', {
    method: 'POST',
    body: JSON.stringify({
      title,
      body,
      data,
      target_device_token: targetDeviceToken,
    }),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to send notification.')
  }
  return response.json()
}
