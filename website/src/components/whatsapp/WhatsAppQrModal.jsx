import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { QrCode, RefreshCw, CheckCircle2 } from 'lucide-react'

export function WhatsAppQrModal({
  isOpen,
  onClose,
  qrCode,
  pairingCode,
  onRefresh,
  onConfirmPairing,
  loading = false,
}) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [useCode, setUseCode] = useState(false)

  const handleSimulateScan = () => {
    onConfirmPairing(phoneNumber || '+1 (555) 019-2834', 'Starwaves User')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Link WhatsApp"
      subtitle="Connect your WhatsApp account to Starwaves and Eve AI"
    >
      <div className="whatsapp-qr-container">
        {!useCode ? (
          <>
            <div className="whatsapp-qr-box">
              {qrCode ? (
                <img src={qrCode} alt="WhatsApp QR Code" />
              ) : (
                <QrCode size={160} color="#000000" />
              )}
            </div>

            <ol className="whatsapp-qr-steps">
              <li>Open <strong>WhatsApp</strong> on your phone</li>
              <li>Tap <strong>Menu (⋮)</strong> or <strong>Settings (⚙)</strong> and select <strong>Linked Devices</strong></li>
              <li>Tap <strong>Link a Device</strong> and point your camera at this QR code</li>
            </ol>

            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onRefresh}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh QR
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setUseCode(true)}
              >
                Link with phone number
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSimulateScan}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle2 size={14} />
                Confirm Link
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', textAlign: 'left' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Enter your phone number to receive an 8-digit pairing code to enter on your phone.
            </p>
            <input
              type="tel"
              className="form-input"
              placeholder="+1 (555) 000-0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              style={{ width: '100%' }}
            />
            {pairingCode && (
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>YOUR PAIRING CODE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.15em', marginTop: '4px' }}>
                  {pairingCode}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setUseCode(false)}>
                Back to QR Code
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSimulateScan}
              >
                Confirm Device
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
