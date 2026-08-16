import { useEffect, useState } from 'react'
import { MessageSquare, QrCode, Trash2, Bot, Bell } from 'lucide-react'
import { ConfirmDialog, SettingsCard } from '../../components/ui'
import {
  fetchWhatsAppStatus,
  disconnectWhatsApp,
  fetchWhatsAppSettings,
  updateWhatsAppSettings,
  initiateWhatsAppPairing,
  confirmWhatsAppPairing,
} from '../../lib/whatsappApi'
import { WhatsAppQrModal } from '../../components/whatsapp/WhatsAppQrModal'

export function WhatsAppSection() {
  const [status, setStatus] = useState({ connected: false })
  const [settings, setSettings] = useState({
    auto_reply_enabled: false,
    auto_reply_prompt: '',
    notifications_enabled: true,
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [disconnectRequested, setDisconnectRequested] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [pairingData, setPairingData] = useState({ qr_code: null, pairing_code: null })

  const loadData = async () => {
    try {
      const [stat, sett] = await Promise.all([
        fetchWhatsAppStatus().catch(() => ({ connected: false })),
        fetchWhatsAppSettings().catch(() => ({})),
      ])
      if (stat) setStatus(stat)
      if (sett) setSettings(sett)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenQr = async () => {
    setIsQrModalOpen(true)
    try {
      const pair = await initiateWhatsAppPairing()
      setPairingData(pair)
    } catch {
      // ignore
    }
  }

  const handleConfirmPair = async (phone, name) => {
    try {
      const updated = await confirmWhatsAppPairing(phone, name)
      setStatus(updated)
      setMessage('WhatsApp connected successfully.')
    } catch {
      setMessage('Failed to connect WhatsApp.')
    }
  }

  const handleDisconnect = async () => {
    setBusy(true)
    try {
      await disconnectWhatsApp()
      setStatus({ connected: false })
      setMessage('WhatsApp disconnected.')
    } catch {
      setMessage('Could not disconnect WhatsApp.')
    } finally {
      setBusy(false)
      setDisconnectRequested(false)
    }
  }

  const handleSaveSettings = async (updates) => {
    try {
      const newSettings = { ...settings, ...updates }
      const saved = await updateWhatsAppSettings(newSettings)
      setSettings(saved)
      setMessage('WhatsApp settings updated.')
    } catch {
      setMessage('Could not save settings.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SettingsCard
        title="WhatsApp Integration"
        description="Connect personal or workspace WhatsApp to chat, receive notifications, and allow Eve to assist with messages."
      >
        {message && (
          <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '16px' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{status.connected ? status.phone_number || 'Linked WhatsApp' : 'Not Connected'}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {status.connected ? `Device: ${status.push_name || 'Active Session'}` : 'Link via QR code to sync chats with Starwaves'}
              </div>
            </div>
          </div>

          {status.connected ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setDisconnectRequested(true)}
              disabled={busy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={14} />
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenQr}
              disabled={busy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <QrCode size={14} />
              Link Device
            </button>
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Eve AI WhatsApp Automation"
        description="Configure how Eve interacts with your WhatsApp messages and contacts."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bot size={18} />
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Global Eve Auto-Responder</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Allow Eve to draft and auto-respond to incoming WhatsApp inquiries
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(settings.auto_reply_enabled)}
              onChange={(e) => handleSaveSettings({ auto_reply_enabled: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={18} />
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Desktop & Push Notifications</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Receive instant alerts in Starwaves when new WhatsApp messages arrive
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(settings.notifications_enabled)}
              onChange={(e) => handleSaveSettings({ notifications_enabled: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
          </label>
        </div>
      </SettingsCard>

      <WhatsAppQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        qrCode={pairingData.qr_code}
        pairingCode={pairingData.pairing_code}
        onRefresh={handleOpenQr}
        onConfirmPairing={handleConfirmPair}
      />

      <ConfirmDialog
        isOpen={disconnectRequested}
        title="Disconnect WhatsApp?"
        message="Are you sure you want to unlink your WhatsApp account? You can re-link at any time."
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectRequested(false)}
      />
    </div>
  )
}
