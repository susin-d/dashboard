import { useMemo } from 'react'
import { Bot, Pin, User, Users, QrCode } from 'lucide-react'
import { SearchBar } from '../ui'

export function WhatsAppChatList({
  chats = [],
  selectedChatId = null,
  onSelectChat,
  onOpenQrModal,
  isConnected = false,
  searchQuery = '',
  onSearchChange,
}) {
  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        chat.name?.toLowerCase().includes(q) ||
        chat.phone_number?.toLowerCase().includes(q) ||
        chat.last_message?.content?.toLowerCase().includes(q)
      )
    })
  }, [chats, searchQuery])

  const formatChatTime = (isoString) => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div className="whatsapp-sidebar">
      <div className="whatsapp-sidebar-header">
        <div className="whatsapp-header-title">
          <h2>WhatsApp</h2>
          <span className={`whatsapp-connection-badge ${isConnected ? 'connected' : ''}`}>
            <span className="dot" />
            {isConnected ? 'Linked' : 'Offline'}
          </span>
        </div>

        <div className="whatsapp-header-actions">
          <button
            type="button"
            className="whatsapp-icon-btn"
            onClick={onOpenQrModal}
            title={isConnected ? 'Device settings & QR' : 'Link WhatsApp'}
          >
            <QrCode size={18} />
          </button>
        </div>
      </div>

      <div className="whatsapp-search-wrapper">
        <SearchBar
          placeholder="Search chats or messages..."
          ariaLabel="Search WhatsApp chats"
          value={searchQuery}
          onChange={onSearchChange}
        />
      </div>

      <div className="whatsapp-chat-list">
        {filteredChats.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {searchQuery ? 'No matching conversations' : 'No chats yet'}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = selectedChatId === chat.id
            const isEve = chat.is_eve || chat.id === 'eve'

            return (
              <button
                key={chat.id}
                type="button"
                className={`whatsapp-chat-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className={`whatsapp-avatar ${isEve ? 'is-eve' : ''}`}>
                  {isEve ? (
                    <Bot size={22} />
                  ) : chat.is_group ? (
                    <Users size={20} />
                  ) : (
                    <User size={20} />
                  )}
                </div>

                <div className="whatsapp-chat-info">
                  <div className="whatsapp-chat-top">
                    <span className="whatsapp-chat-name">
                      {chat.pinned && <Pin size={12} style={{ display: 'inline', marginRight: 4 }} />}
                      {chat.name}
                    </span>
                    <span className="whatsapp-chat-time">
                      {formatChatTime(chat.last_message?.timestamp || chat.updated_at)}
                    </span>
                  </div>

                  <div className="whatsapp-chat-bottom">
                    <p className="whatsapp-chat-preview">
                      {chat.last_message ? (
                        <>
                          {chat.last_message.is_from_me ? 'You: ' : ''}
                          {chat.last_message.content || (chat.last_message.media ? `[${chat.last_message.media.type}]` : '')}
                        </>
                      ) : (
                        isEve ? 'Ask Eve anything or manage workspace...' : 'No messages yet'
                      )}
                    </p>

                    {chat.unread_count > 0 && (
                      <span className="whatsapp-unread-badge">{chat.unread_count}</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
