import { useEffect, useState } from 'react'
import { MessageSquare, QrCode, Trash2, Bot, Bell } from 'lucide-react'
import { ConfirmDialog, SectionHeading, SettingsCard } from '../../components/ui'
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
    <div className="setting-section" id="settings-whatsapp">
      <SectionHeading
        title="WhatsApp"
        description="Connect personal or workspace WhatsApp to chat, receive notifications, and configure Eve AI automations."
      />

      <div className="apps-settings-stack">
        <SettingsCard
          icon={<MessageSquare size={19} />}
          title="WhatsApp Account"
          description="Link your WhatsApp account to sync conversations, contacts, and real-time alerts."
        action={
          status.connected ? (
            <button
              type="button"
              className="workspace-connected"
              onClick={() => setDisconnectRequested(true)}
              disabled={busy}
            >
              <Trash2 size={14} />
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenQr}
              disabled={busy}
            >
              <QrCode size={14} />
              Link Device
            </button>
          )
        }
      >
        <div className="whatsapp-settings-body">
          {message && (
            <div className="whatsapp-settings-alert">
              {message}
            </div>
          )}

          <div className="whatsapp-status-card">
            <div className="whatsapp-status-left">
              <div className="whatsapp-status-avatar">
                <MessageSquare size={20} />
              </div>
              <div className="whatsapp-status-info">
                <strong>{status.connected ? status.phone_number || 'Linked WhatsApp' : 'Not Connected'}</strong>
                <small>
                  {status.connected ? `Device: ${status.push_name || 'Active Session'}` : 'Link via QR code to sync chats with Starwaves'}
                </small>
              </div>
            </div>
            {status.connected && (
              <span className="whatsapp-status-badge">
                Connected
              </span>
            )}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<Bot size={19} />}
        title="Eve AI WhatsApp Automation"
        description="Configure how Eve interacts with your WhatsApp messages and contacts."
      >
        <div className="whatsapp-settings-body">
          <div className="whatsapp-automation-list">
            <label className="whatsapp-automation-item">
              <div className="whatsapp-automation-left">
                <div className="whatsapp-automation-icon">
                  <Bot size={18} />
                </div>
                <div className="whatsapp-automation-text">
                  <strong>Global Eve Auto-Responder</strong>
                  <small>
                    Allow Eve to draft and auto-respond to incoming WhatsApp inquiries
                  </small>
                </div>
              </div>
              <div className="whatsapp-toggle-switch">
                <input
                  type="checkbox"
                  checked={Boolean(settings.auto_reply_enabled)}
                  onChange={(e) => handleSaveSettings({ auto_reply_enabled: e.target.checked })}
                />
                <span className="whatsapp-toggle-slider" />
              </div>
            </label>

            <label className="whatsapp-automation-item">
              <div className="whatsapp-automation-left">
                <div className="whatsapp-automation-icon">
                  <Bell size={18} />
                </div>
                <div className="whatsapp-automation-text">
                  <strong>Desktop & Push Notifications</strong>
                  <small>
                    Receive instant alerts in Starwaves when new WhatsApp messages arrive
                  </small>
                </div>
              </div>
              <div className="whatsapp-toggle-switch">
                <input
                  type="checkbox"
                  checked={Boolean(settings.notifications_enabled)}
                  onChange={(e) => handleSaveSettings({ notifications_enabled: e.target.checked })}
                />
                <span className="whatsapp-toggle-slider" />
              </div>
            </label>
          </div>
        </div>
      </SettingsCard>
      </div>

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
