import { useEffect, useState } from 'react'
import { Bell, Plus, RefreshCw, Send, Smartphone, Trash2 } from 'lucide-react'
import {
  getRegisteredDevices,
  registerDeviceToken,
  sendPushNotification,
  unregisterDeviceToken,
} from '../../lib/workspaceApi'
import { useLocalNotifications } from '../../hooks/useLocalNotifications'
import { requestNotificationPermission } from '../../utils/browserNotifications'

export function PushNotificationsSection({ user }) {
  const [devices, setDevices] = useState([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [deviceMessage, setDeviceMessage] = useState('')
  const [deviceTokenInput, setDeviceTokenInput] = useState('')
  const [deviceNameInput, setDeviceNameInput] = useState('')
  const [pushTitle, setPushTitle] = useState('StarWaves Alert')
  const [pushBody, setPushBody] = useState('Your project deadline is approaching!')
  const [pushSending, setPushSending] = useState(false)
  const [localNotifTitle, setLocalNotifTitle] = useState('StarWaves Task Reminder')
  const [localNotifBody, setLocalNotifBody] = useState('Submit code review report')
  const [localNotifMessage, setLocalNotifMessage] = useState('')
  const [browserNotifMessage, setBrowserNotifMessage] = useState('')
  const {
    notifications: localNotifications,
    addNotification,
    markRead,
    deleteNotification,
    clearAll,
  } = useLocalNotifications()

  const fetchRegisteredDevices = async () => {
    setDevicesLoading(true)
    try {
      const data = await getRegisteredDevices()
      setDevices(data.devices || [])
    } catch (err) {
      setDeviceMessage(err.message || 'Could not load devices.')
    } finally {
      setDevicesLoading(false)
    }
  }

  useEffect(() => {
    fetchRegisteredDevices()
  }, [user?.uid])

  const handleRegisterDeviceToken = async (e) => {
    e?.preventDefault()
    if (!deviceTokenInput.trim()) {
      setDeviceMessage('Token string is required.')
      return
    }
    setDevicesLoading(true)
    setDeviceMessage('')
    try {
      await registerDeviceToken(deviceTokenInput.trim(), deviceNameInput.trim() || 'My Device')
      setDeviceMessage('Device token registered successfully.')
      setDeviceTokenInput('')
      setDeviceNameInput('')
      await fetchRegisteredDevices()
    } catch (err) {
      setDeviceMessage(err.message || 'Could not register token.')
    } finally {
      setDevicesLoading(false)
    }
  }

  const handleUnregisterDeviceToken = async (tokenId) => {
    setDevicesLoading(true)
    setDeviceMessage('')
    try {
      await unregisterDeviceToken(tokenId)
      setDeviceMessage('Device token unregistered successfully.')
      await fetchRegisteredDevices()
    } catch (err) {
      setDeviceMessage(err.message || 'Could not unregister token.')
    } finally {
      setDevicesLoading(false)
    }
  }

  const handleSendPush = async (e) => {
    e?.preventDefault()
    if (!pushTitle.trim() || !pushBody.trim()) {
      setDeviceMessage('Push title and body are required.')
      return
    }
    setPushSending(true)
    setDeviceMessage('')
    try {
      const res = await sendPushNotification(
        pushTitle.trim(),
        pushBody.trim(),
        { source: 'settings-test' },
      )
      setDeviceMessage(`Push sent successfully! Status: ${res.status || 'sent'}`)
    } catch (err) {
      setDeviceMessage(err.message || 'Failed to send push notification.')
    } finally {
      setPushSending(false)
    }
  }

  const handleEnableBrowserNotifications = async () => {
    setBrowserNotifMessage('')
    try {
      const permission = await requestNotificationPermission()
      setBrowserNotifMessage(
        permission === 'granted'
          ? 'Browser notifications enabled. Reminders will appear when events enter their 1-hour window.'
          : `Notification permission ${permission}.`,
      )
    } catch (err) {
      setBrowserNotifMessage(err.message || 'Could not enable browser notifications.')
    }
  }

  const handleSendLocalNotification = (e) => {
    e?.preventDefault()
    if (!localNotifTitle.trim() || !localNotifBody.trim()) {
      setLocalNotifMessage('Title and body are required.')
      return
    }
    addNotification(localNotifTitle.trim(), localNotifBody.trim())
    setLocalNotifTitle('')
    setLocalNotifBody('')
    setLocalNotifMessage('Notification delivered instantly to this browser.')
  }

  return (
    <div className="setting-section" id="settings-push-notifications">
      <div className="section-heading">
        <h2>Push Notifications &amp; Devices</h2>
        <p>Register device FCM tokens, send real-time push notifications, and deliver instant in-browser notifications stored locally.</p>
      </div>

      <div className="workspace-settings-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #09090b)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={18} /> Registered User Devices
            </h3>
            <button
              type="button"
              className="google-calendar-refresh"
              onClick={fetchRegisteredDevices}
              disabled={devicesLoading}
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            >
              <RefreshCw size={13} className={devicesLoading ? 'spin' : ''} /> Refresh Devices
            </button>
          </div>

          {devices.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted, #71717a)' }}>
              No device tokens registered yet. Register a device FCM token below to receive push notifications.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {devices.map((dev) => (
                <div
                  key={dev.token_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #27272a)',
                    backgroundColor: 'var(--bg-secondary, #121212)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.9rem', display: 'block', color: 'var(--text-primary, #ffffff)' }}>
                      {dev.device_name}
                    </strong>
                    <code style={{ fontSize: '0.78rem', color: 'var(--text-muted, #71717a)' }}>
                      Token: {dev.token_preview}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnregisterDeviceToken(dev.token_id)}
                    disabled={devicesLoading}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color, #27272a)',
                      color: 'var(--text-primary, #ffffff)',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <Trash2 size={13} /> Unregister
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #71717a)' }}>
            Desktop notifications fire when a task, event, contest, or deadline enters its 1-hour reminder window while the app is open.
          </p>
          <button
            type="button"
            className="google-calendar-add-account"
            onClick={handleEnableBrowserNotifications}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <Bell size={13} /> Enable Browser Notifications
          </button>
        </div>
        {browserNotifMessage && (
          <p className="hackathon-source-message" role="status" style={{ margin: 0 }}>
            {browserNotifMessage}
          </p>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color, #27272a)', margin: '0' }} />

        <form onSubmit={handleRegisterDeviceToken} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #09090b)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Register Device Token
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Device Name (e.g. Chrome Browser, Android Phone)"
              value={deviceNameInput}
              onChange={(e) => setDeviceNameInput(e.target.value)}
              style={{
                flex: '1 1 200px',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid var(--border-color, #27272a)',
                backgroundColor: 'var(--bg-input, #09090b)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.85rem',
              }}
            />
            <input
              type="text"
              placeholder="FCM Device Token String"
              value={deviceTokenInput}
              onChange={(e) => setDeviceTokenInput(e.target.value)}
              style={{
                flex: '2 1 300px',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid var(--border-color, #27272a)',
                backgroundColor: 'var(--bg-input, #09090b)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.85rem',
              }}
            />
            <button
              type="submit"
              className="google-calendar-add-account"
              disabled={devicesLoading}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Plus size={14} /> Register Token
            </button>
          </div>
        </form>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color, #27272a)', margin: '0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <form onSubmit={handleSendPush} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #09090b)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={18} /> Instant Push Test
            </h3>
            <input
              type="text"
              placeholder="Push Title"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid var(--border-color, #27272a)',
                backgroundColor: 'var(--bg-input, #09090b)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.85rem',
              }}
            />
            <textarea
              placeholder="Push Message Body"
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              rows={2}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid var(--border-color, #27272a)',
                backgroundColor: 'var(--bg-input, #09090b)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.85rem',
                resize: 'none',
              }}
            />
            <button
              type="submit"
              className="google-calendar-add-account"
              disabled={pushSending}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Send size={13} /> Send Instant Push
            </button>
          </form>

          <form onSubmit={handleSendLocalNotification} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #09090b)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} /> Instant Local Notification
            </h3>
            <input
              type="text"
              placeholder="Notification Title"
              value={localNotifTitle}
              onChange={(e) => setLocalNotifTitle(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid var(--border-color, #27272a)',
                backgroundColor: 'var(--bg-input, #09090b)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.85rem',
              }}
            />
            <textarea
              placeholder="Notification Message Body"
              value={localNotifBody}
              onChange={(e) => setLocalNotifBody(e.target.value)}
              rows={2}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid var(--border-color, #27272a)',
                backgroundColor: 'var(--bg-input, #09090b)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.85rem',
                resize: 'none',
              }}
            />
            <button
              type="submit"
              className="google-calendar-refresh"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Bell size={13} /> Send Locally Now
            </button>
          </form>
        </div>

        {localNotifMessage && (
          <p className="hackathon-source-message" role="status" style={{ margin: 0 }}>
            {localNotifMessage}
          </p>
        )}

        {localNotifications.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary, #09090b)' }}>
                Stored in this browser ({localNotifications.length})
              </h3>
              <button
                type="button"
                className="google-calendar-refresh"
                onClick={clearAll}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                <Trash2 size={13} /> Clear All
              </button>
            </div>
            {localNotifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #27272a)',
                  backgroundColor: 'var(--bg-secondary, #121212)',
                  gap: '12px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: '0.9rem', display: 'block', color: 'var(--text-primary, #ffffff)' }}>
                    {notification.title}
                    {notification.unread && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted, #71717a)' }}>
                        {' '}&bull; Unread
                      </span>
                    )}
                  </strong>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #71717a)' }}>
                    {notification.body}
                  </p>
                  <small style={{ fontSize: '0.72rem', color: 'var(--text-muted, #71717a)' }}>
                    {new Date(notification.created_at).toLocaleString()}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="google-calendar-refresh"
                    onClick={() => markRead(notification.id)}
                    disabled={!notification.unread}
                    style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  >
                    Mark Read
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteNotification(notification.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color, #27272a)',
                      color: 'var(--text-primary, #ffffff)',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {deviceMessage && (
          <p className="hackathon-source-message" role="status" style={{ margin: 0 }}>
            {deviceMessage}
          </p>
        )}
      </div>
    </div>
  )
}
