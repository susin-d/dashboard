import { useEffect, useState, useMemo } from 'react'
import {
  MessageSquare,
  Search,
  Send,
  Users,
  User,
  Settings,
  CheckCheck,
  ChevronDown,
  Globe,
  Lock,
} from 'lucide-react'
import { getGoogleChatAccounts } from '../lib/googleChatApi'

const SAMPLE_SPACES = [
  {
    id: 'space-eng',
    name: 'Engineering & Tech',
    type: 'space',
    accountEmail: 'dev.lead@starwaves.io',
    accountName: 'Engineering Google Account',
    unreadCount: 2,
    lastMessage: 'The new API endpoints are live in staging.',
    lastTime: '10:42 AM',
    membersCount: 14,
    isPrivate: false,
    messages: [
      {
        id: 'msg-1',
        sender: 'Alex Rivera',
        senderEmail: 'alex@starwaves.io',
        avatar: 'AR',
        time: '09:15 AM',
        content: 'Good morning team! We are prepping the v2 release build today.',
        isSelf: false,
      },
      {
        id: 'msg-2',
        sender: 'Sarah Chen',
        senderEmail: 'sarah@starwaves.io',
        avatar: 'SC',
        time: '09:30 AM',
        content: 'All frontend components adhere to the monochrome design tokens.',
        isSelf: false,
      },
      {
        id: 'msg-3',
        sender: 'You',
        senderEmail: 'dev.lead@starwaves.io',
        avatar: 'ME',
        time: '10:40 AM',
        content: 'Great progress. I will verify the backend routes now.',
        isSelf: true,
      },
      {
        id: 'msg-4',
        sender: 'Alex Rivera',
        senderEmail: 'alex@starwaves.io',
        avatar: 'AR',
        time: '10:42 AM',
        content: 'The new API endpoints are live in staging.',
        isSelf: false,
      },
    ],
  },
  {
    id: 'space-product',
    name: 'Product Design & UX',
    type: 'space',
    accountEmail: 'dev.lead@starwaves.io',
    accountName: 'Engineering Google Account',
    unreadCount: 0,
    lastMessage: 'Updated the wireframes for the new Settings page.',
    lastTime: 'Yesterday',
    membersCount: 8,
    isPrivate: true,
    messages: [
      {
        id: 'msg-p1',
        sender: 'Maya Lin',
        senderEmail: 'maya@starwaves.io',
        avatar: 'ML',
        time: 'Yesterday 3:15 PM',
        content: 'Updated the wireframes for the new Settings page.',
        isSelf: false,
      },
      {
        id: 'msg-p2',
        sender: 'You',
        senderEmail: 'dev.lead@starwaves.io',
        avatar: 'ME',
        time: 'Yesterday 3:45 PM',
        content: 'Looks clean and minimalist. Exactly matches our brand.',
        isSelf: true,
      },
    ],
  },
  {
    id: 'space-dm-1',
    name: 'David Kim',
    type: 'dm',
    accountEmail: 'personal.dev@gmail.com',
    accountName: 'Personal Google Account',
    unreadCount: 1,
    lastMessage: 'Are we still meeting at 4 PM for the code review?',
    lastTime: '11:05 AM',
    membersCount: 2,
    isPrivate: true,
    messages: [
      {
        id: 'msg-d1',
        sender: 'David Kim',
        senderEmail: 'david@gmail.com',
        avatar: 'DK',
        time: '11:05 AM',
        content: 'Are we still meeting at 4 PM for the code review?',
        isSelf: false,
      },
    ],
  },
  {
    id: 'space-general',
    name: 'StarWaves Announcements',
    type: 'space',
    accountEmail: 'personal.dev@gmail.com',
    accountName: 'Personal Google Account',
    unreadCount: 0,
    lastMessage: 'Welcome to the new Google Chat workspace integration!',
    lastTime: 'Jul 24',
    membersCount: 42,
    isPrivate: false,
    messages: [
      {
        id: 'msg-g1',
        sender: 'System Bot',
        senderEmail: 'bot@google.chat',
        avatar: 'GC',
        time: 'Jul 24 10:00 AM',
        content: 'Welcome to the new Google Chat workspace integration!',
        isSelf: false,
      },
    ],
  },
]

export function ChatsPage({ onNavigate }) {
  const [accounts, setAccounts] = useState([])
  const [selectedAccountEmail, setSelectedAccountEmail] = useState('all')
  const [spaces, setSpaces] = useState(SAMPLE_SPACES)
  const [activeSpaceId, setActiveSpaceId] = useState(SAMPLE_SPACES[0].id)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all', 'spaces', 'dms'

  useEffect(() => {
    let active = true
    getGoogleChatAccounts()
      .then(({ accounts: fetchedAccounts }) => {
        if (active) {
          setAccounts(fetchedAccounts || [])
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const filteredSpaces = useMemo(() => {
    return spaces.filter((space) => {
      const matchAccount =
        selectedAccountEmail === 'all' || space.accountEmail === selectedAccountEmail
      const matchSearch =
        space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        space.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      const matchType =
        filterType === 'all' ||
        (filterType === 'spaces' && space.type === 'space') ||
        (filterType === 'dms' && space.type === 'dm')
      return matchAccount && matchSearch && matchType
    })
  }, [spaces, selectedAccountEmail, searchQuery, filterType])

  const activeSpace = useMemo(() => {
    return spaces.find((s) => s.id === activeSpaceId) || filteredSpaces[0] || spaces[0]
  }, [spaces, activeSpaceId, filteredSpaces])

  const handleSendMessage = (e) => {
    e?.preventDefault()
    if (!messageInput.trim() || !activeSpace) return

    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: 'You',
      senderEmail: activeSpace.accountEmail || 'you@starwaves.io',
      avatar: 'ME',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: messageInput.trim(),
      isSelf: true,
    }

    setSpaces((prevSpaces) =>
      prevSpaces.map((space) => {
        if (space.id === activeSpace.id) {
          return {
            ...space,
            lastMessage: newMessage.content,
            lastTime: newMessage.time,
            messages: [...space.messages, newMessage],
          }
        }
        return space
      }),
    )

    setMessageInput('')
  }

  const handleQuickReply = (text) => {
    setMessageInput(text)
  }

  return (
    <section className="chats-page">
      <div className="page-heading">
        <div>
          <p>Communication</p>
          <h1>Chats</h1>
        </div>
        <div className="page-heading-actions">
          {accounts.length > 0 ? (
            <div className="account-badge-pill">
              <span className="dot active"></span>
              {accounts.length} Google {accounts.length === 1 ? 'Account' : 'Accounts'} Connected
            </div>
          ) : (
            <button
              className="secondary-button icon-button-text"
              onClick={() => onNavigate && onNavigate('setting')}
            >
              <Settings size={16} />
              <span>Connect Google Chat in Settings</span>
            </button>
          )}
        </div>
      </div>

      <div className="chats-container">
        {/* Sidebar Navigation & Accounts Filter */}
        <aside className="chats-sidebar">
          {/* Account Selector */}
          <div className="account-selector-box">
            <label className="input-label" htmlFor="account-filter-select">
              Google Account
            </label>
            <div className="select-wrapper">
              <select
                id="account-filter-select"
                className="select-input"
                value={selectedAccountEmail}
                onChange={(e) => setSelectedAccountEmail(e.target.value)}
              >
                <option value="all">All Accounts ({accounts.length ? accounts.length : 'Demo'})</option>
                {accounts.length > 0 ? (
                  accounts.map((acc) => (
                    <option key={acc.id} value={acc.email}>
                      {acc.email}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="dev.lead@starwaves.io">dev.lead@starwaves.io (Work)</option>
                    <option value="personal.dev@gmail.com">personal.dev@gmail.com (Personal)</option>
                  </>
                )}
              </select>
              <ChevronDown size={14} className="select-icon" />
            </div>
          </div>

          {/* Search Bar */}
          <div className="chats-search-bar">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search spaces or messages…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Filter Chips */}
          <div className="chats-filter-chips">
            <button
              className={`chip ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={`chip ${filterType === 'spaces' ? 'active' : ''}`}
              onClick={() => setFilterType('spaces')}
            >
              Spaces
            </button>
            <button
              className={`chip ${filterType === 'dms' ? 'active' : ''}`}
              onClick={() => setFilterType('dms')}
            >
              Direct Messages
            </button>
          </div>

          {/* Spaces & DM List */}
          <div className="chats-list">
            {filteredSpaces.length === 0 ? (
              <div className="empty-chats">No conversations match your search.</div>
            ) : (
              filteredSpaces.map((space) => {
                const isActive = space.id === activeSpace?.id
                return (
                  <button
                    key={space.id}
                    className={`chat-item ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveSpaceId(space.id)}
                  >
                    <div className="chat-item-avatar">
                      {space.type === 'space' ? (
                        <Users size={18} />
                      ) : (
                        <User size={18} />
                      )}
                    </div>
                    <div className="chat-item-content">
                      <div className="chat-item-header">
                        <span className="chat-item-title">{space.name}</span>
                        <span className="chat-item-time">{space.lastTime}</span>
                      </div>
                      <div className="chat-item-footer">
                        <span className="chat-item-snippet">{space.lastMessage}</span>
                        {space.unreadCount > 0 && (
                          <span className="unread-badge">{space.unreadCount}</span>
                        )}
                      </div>
                      <div className="chat-item-account-tag">{space.accountEmail}</div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* Main Conversation Window */}
        <main className="chats-main">
          {activeSpace ? (
            <>
              {/* Conversation Header */}
              <div className="chat-header">
                <div className="chat-header-info">
                  <div className="chat-header-avatar">
                    {activeSpace.type === 'space' ? <Users size={20} /> : <User size={20} />}
                  </div>
                  <div>
                    <h2 className="chat-header-title">
                      {activeSpace.name}
                      {activeSpace.isPrivate ? (
                        <Lock size={14} className="meta-icon" />
                      ) : (
                        <Globe size={14} className="meta-icon" />
                      )}
                    </h2>
                    <p className="chat-header-sub">
                      {activeSpace.type === 'space'
                        ? `${activeSpace.membersCount} members`
                        : 'Direct Message'}{' '}
                      • Linked to {activeSpace.accountEmail}
                    </p>
                  </div>
                </div>

                <div className="chat-header-actions">
                  <button
                    className="icon-button"
                    title="Settings & Accounts"
                    onClick={() => onNavigate && onNavigate('setting')}
                  >
                    <Settings size={18} />
                  </button>
                </div>
              </div>

              {/* Message History */}
              <div className="chat-messages-container">
                {activeSpace.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-message-row ${msg.isSelf ? 'self' : 'other'}`}
                  >
                    {!msg.isSelf && (
                      <div className="message-avatar" title={msg.senderEmail}>
                        {msg.avatar}
                      </div>
                    )}
                    <div className="message-bubble-wrapper">
                      {!msg.isSelf && (
                        <div className="message-sender-name">
                          {msg.sender} <span className="message-time">{msg.time}</span>
                        </div>
                      )}
                      <div className="message-bubble">
                        {msg.content}
                      </div>
                      {msg.isSelf && (
                        <div className="message-self-meta">
                          <span className="message-time">{msg.time}</span>
                          <CheckCheck size={14} className="read-icon" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Reply Chips */}
              <div className="quick-reply-bar">
                <span className="quick-reply-label">Quick replies:</span>
                <button
                  className="quick-chip"
                  onClick={() => handleQuickReply('Acknowledged, thanks!')}
                >
                  Acknowledged, thanks!
                </button>
                <button
                  className="quick-chip"
                  onClick={() => handleQuickReply('I will review this right away.')}
                >
                  I will review this right away.
                </button>
                <button
                  className="quick-chip"
                  onClick={() => handleQuickReply('Let us schedule a quick sync.')}
                >
                  Let us schedule a quick sync.
                </button>
              </div>

              {/* Message Composer */}
              <form className="chat-composer" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder={`Reply in ${activeSpace.name} using ${activeSpace.accountEmail}…`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="composer-input"
                />
                <button
                  type="submit"
                  className="primary-button composer-send-button"
                  disabled={!messageInput.trim()}
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="no-active-chat">
              <MessageSquare size={48} />
              <h3>No Chat Selected</h3>
              <p>Select a Google Chat space or direct message from the sidebar to view conversations.</p>
            </div>
          )}
        </main>
      </div>
    </section>
  )
}
