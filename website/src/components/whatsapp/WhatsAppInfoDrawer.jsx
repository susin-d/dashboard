import { X, Bot, Bell, Image as ImageIcon, FileText, Sparkles } from 'lucide-react'

export function WhatsAppInfoDrawer({
  chat,
  onClose,
  onToggleEveAutoReply,
  onSummarizeChat,
}) {
  if (!chat) return null

  const isEve = chat.is_eve || chat.id === 'eve'

  return (
    <div className="whatsapp-info-drawer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Chat Details</h3>
        <button
          type="button"
          className="whatsapp-icon-btn"
          onClick={onClose}
          title="Close details"
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
        <div className={`whatsapp-avatar ${isEve ? 'is-eve' : ''}`} style={{ width: 64, height: 64, fontSize: '1.5rem' }}>
          {isEve ? <Bot size={32} /> : chat.name?.[0]?.toUpperCase() || 'W'}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{chat.name}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
            {chat.phone_number || (isEve ? 'Eve Assistant' : 'WhatsApp Contact')}
          </div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

      {!isEve && (
        <div className="whatsapp-drawer-section">
          <h4>Eve AI Settings</h4>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={16} />
              <span style={{ fontSize: '0.875rem' }}>Eve Auto-Responder</span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(chat.eve_auto_reply)}
              onChange={(e) => onToggleEveAutoReply?.(chat.id, e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => onSummarizeChat?.(chat.id)}
            style={{ width: '100%', minHeight: '36px', marginTop: '6px' }}
          >
            <Sparkles size={14} />
            Generate Summary & Actions
          </button>
        </div>
      )}

      <div className="whatsapp-drawer-section">
        <h4>Notifications</h4>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'var(--bg-primary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={16} />
            <span style={{ fontSize: '0.875rem' }}>Mute Notifications</span>
          </div>
          <input type="checkbox" style={{ cursor: 'pointer' }} />
        </div>
      </div>

      <div className="whatsapp-drawer-section">
        <h4>Shared Media & Docs</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div
            style={{
              padding: '16px 8px',
              textAlign: 'center',
              background: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <ImageIcon size={18} style={{ margin: '0 auto 4px auto', display: 'block' }} />
            0 Photos
          </div>
          <div
            style={{
              padding: '16px 8px',
              textAlign: 'center',
              background: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <FileText size={18} style={{ margin: '0 auto 4px auto', display: 'block' }} />
            0 Documents
          </div>
        </div>
      </div>
    </div>
  )
}
