import { useMemo, useState } from 'react'
import { Bot, Pin, User, Users, QrCode, Sparkles, Star } from 'lucide-react'
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
  const [activeFilter, setActiveFilter] = useState('all') // 'all', 'unread', 'favourites', 'groups'

  // Counts for pills
  const unreadTotal = useMemo(() => {
    return chats.reduce((acc, c) => acc + (c.unread_count || 0), 0)
  }, [chats])

  const groupsCount = useMemo(() => {
    return chats.filter((c) => c.is_group).length
  }, [chats])

  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      // Pill filtering
      if (activeFilter === 'unread' && (!chat.unread_count || chat.unread_count <= 0)) {
        return false
      }
      if (activeFilter === 'favourites' && !chat.pinned && !chat.is_starred) {
        return false
      }
      if (activeFilter === 'groups' && !chat.is_group) {
        return false
      }

      // Search query filtering
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        chat.name?.toLowerCase().includes(q) ||
        chat.phone_number?.toLowerCase().includes(q) ||
        chat.description?.toLowerCase().includes(q) ||
        chat.last_message?.content?.toLowerCase().includes(q) ||
        chat.participants?.some((p) => p.toLowerCase().includes(q))
      )
    })
  }, [chats, searchQuery, activeFilter])

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
      {/* Top Header */}
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

      {/* Search Bar */}
      <div className="whatsapp-search-wrapper">
        <SearchBar
          placeholder="Search or start a new chat"
          ariaLabel="Search WhatsApp chats"
          value={searchQuery}
          onChange={onSearchChange}
        />
      </div>

      {/* Filter Tabs / Pills (All, Unread, Favourites, Groups) */}
      <div className="whatsapp-filter-pills">
        <button
          type="button"
          className={`whatsapp-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`whatsapp-filter-pill ${activeFilter === 'unread' ? 'active' : ''}`}
          onClick={() => setActiveFilter('unread')}
        >
          Unread {unreadTotal > 0 && <span className="whatsapp-pill-count">{unreadTotal}</span>}
        </button>
        <button
          type="button"
          className={`whatsapp-filter-pill ${activeFilter === 'favourites' ? 'active' : ''}`}
          onClick={() => setActiveFilter('favourites')}
        >
          Favourites
        </button>
        <button
          type="button"
          className={`whatsapp-filter-pill ${activeFilter === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveFilter('groups')}
        >
          Groups {groupsCount > 0 && <span className="whatsapp-pill-count">{groupsCount}</span>}
        </button>
      </div>

      {/* Chat List */}
      <div className="whatsapp-chat-list">
        {filteredChats.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {searchQuery
              ? 'No matching conversations'
              : activeFilter !== 'all'
              ? `No ${activeFilter} chats`
              : 'No chats yet'}
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
                <div className={`whatsapp-avatar ${isEve ? 'is-eve' : chat.is_group ? 'is-group' : ''}`}>
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
                    <span className="whatsapp-chat-name" title={chat.name}>
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
                          {chat.last_message.is_from_me ? (
                            <span style={{ fontWeight: 600 }}>You: </span>
                          ) : chat.is_group && chat.last_message.sender_name ? (
                            <span style={{ fontWeight: 600 }}>{chat.last_message.sender_name}: </span>
                          ) : null}
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
