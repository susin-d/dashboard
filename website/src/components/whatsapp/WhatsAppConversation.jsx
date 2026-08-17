import { useEffect, useRef, useState, useMemo } from 'react'
import {
  Send,
  Paperclip,
  Mic,
  Square,
  Play,
  Pause,
  Check,
  CheckCheck,
  Sparkles,
  Info,
  Smile,
  Bot,
  User,
  Users,
  FileText,
  Phone,
  Video,
  Search,
  ChevronDown,
  CornerUpLeft,
  Copy,
  Star,
  Trash2,
  Share2,
  X,
  Pin,
} from 'lucide-react'
import { Markdown } from '../ui/Markdown'

function formatSenderName(name, senderId) {
  if (!name && !senderId) return 'Contact'
  const raw = (name && name !== 'Contact' && name !== '1289') ? name : (senderId || 'Contact')
  const clean = raw.replace(/@s\.whatsapp\.net|@g\.us/g, '')
  if (/^\d{10,15}$/.test(clean)) {
    return `+${clean}`
  }
  return clean
}

function formatMessageContent(text) {
  if (!text) return ''
  return text.replace(/@(\d{7,15})/g, '**@+$1**')
}

function getSenderInitial(name) {
  if (!name) return '?'
  const clean = name.trim().replace(/^[@+~]/, '')
  return (clean[0] || '?').toUpperCase()
}

function formatReactions(reactions) {
  if (!reactions || reactions.length === 0) return null
  const emojiSet = []
  let totalCount = 0
  for (const r of reactions) {
    if (r && r.emoji) {
      if (!emojiSet.includes(r.emoji)) {
        emojiSet.push(r.emoji)
      }
      totalCount += (r.count || 1)
    }
  }
  if (emojiSet.length === 0) return null
  return {
    emojis: emojiSet.slice(0, 3),
    totalCount: totalCount,
  }
}

export function WhatsAppConversation({
  chat,
  messages = [],
  hasMoreMessages = false,
  isLoadingMore = false,
  onLoadMoreMessages,
  onSendMessage,
  onOpenInfoDrawer,
  onGenerateEveDraft,
  onSummarizeChat,
  onReactToMessage,
  onStarMessage,
  onDeleteMessage,
  isDrafting = false,
}) {
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [playingAudioId, setPlayingAudioId] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [hoveredMessageId, setHoveredMessageId] = useState(null)
  const [activeMenuMessageId, setActiveMenuMessageId] = useState(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [inChatSearchQuery, setInChatSearchQuery] = useState('')
  const [copiedToast, setCopiedToast] = useState(false)
  const [infoModalMessage, setInfoModalMessage] = useState(null)

  const messagesEndRef = useRef(null)
  const messagesFeedRef = useRef(null)
  const isFetchingMoreRef = useRef(false)
  const previousScrollHeightRef = useRef(null)
  const initialScrollDoneRef = useRef(false)
  const fileInputRef = useRef(null)
  const menuRef = useRef(null)

  const isEve = chat?.is_eve || chat?.id === 'eve'

  // Reset scroll and load tracking when active chat changes
  useEffect(() => {
    initialScrollDoneRef.current = false
    previousScrollHeightRef.current = null
    isFetchingMoreRef.current = false
  }, [chat?.id])

  useEffect(() => {
    if (!isLoadingMore) {
      isFetchingMoreRef.current = false
    }
  }, [isLoadingMore])

  const handleFeedScroll = (e) => {
    const { scrollTop, scrollHeight } = e.currentTarget
    if (
      scrollTop < 150 &&
      hasMoreMessages &&
      !isLoadingMore &&
      !isFetchingMoreRef.current &&
      messages.length > 0
    ) {
      isFetchingMoreRef.current = true
      previousScrollHeightRef.current = scrollHeight
      onLoadMoreMessages?.()
    }
  }

  // Scroll to bottom on initial mount or when user sends a new message (if not loading more)
  useEffect(() => {
    if (previousScrollHeightRef.current === null && !isSearchOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: initialScrollDoneRef.current ? 'smooth' : 'auto' })
      initialScrollDoneRef.current = true
    }
  }, [messages, isSearchOpen])

  // Preserve scroll position when older messages are prepended to the feed
  useEffect(() => {
    if (previousScrollHeightRef.current !== null && messagesFeedRef.current) {
      const newScrollHeight = messagesFeedRef.current.scrollHeight
      const diff = newScrollHeight - previousScrollHeightRef.current
      if (diff > 0) {
        messagesFeedRef.current.scrollTop += diff
      }
      previousScrollHeightRef.current = null
      isFetchingMoreRef.current = false
    }
  }, [messages])

  // Close context menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuMessageId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSend = (e) => {
    e?.preventDefault()
    if (!inputText.trim()) return
    onSendMessage({
      chatId: chat.id,
      content: inputText.trim(),
      replyToMessageId: replyingTo?.id || null,
    })
    setInputText('')
    setReplyingTo(null)
    setShowEmojiPicker(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleToggleAudio = (msgId) => {
    setPlayingAudioId((prev) => (prev === msgId ? null : msgId))
  }

  const handleSimulateVoiceNote = () => {
    if (isRecording) {
      setIsRecording(false)
      onSendMessage({
        chatId: chat.id,
        content: 'Voice note (0:08)',
        replyToMessageId: replyingTo?.id || null,
        media: {
          type: 'audio',
          url: '',
          duration_seconds: 8.0,
          filename: 'voice_note.ogg',
        },
      })
      setReplyingTo(null)
    } else {
      setIsRecording(true)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImg = file.type.startsWith('image/')
    const reader = new FileReader()
    reader.onload = (uploadEvent) => {
      onSendMessage({
        chatId: chat.id,
        content: file.name,
        replyToMessageId: replyingTo?.id || null,
        media: {
          type: isImg ? 'image' : 'document',
          url: uploadEvent.target.result,
          filename: file.name,
          file_size_bytes: file.size,
          mimetype: file.type,
        },
      })
      setReplyingTo(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleApplyEveDraft = async () => {
    if (onGenerateEveDraft) {
      const draft = await onGenerateEveDraft(chat.id)
      if (draft) {
        setInputText(draft)
      }
    }
  }

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content)
    setCopiedToast(true)
    setTimeout(() => setCopiedToast(false), 2000)
    setActiveMenuMessageId(null)
  }

  const handleAskEveAboutMessage = (msg) => {
    setInputText(`@eve What does this mean or what actions are needed? "${msg.content}"`)
    setActiveMenuMessageId(null)
  }

  const formatMessageTime = (isoString) => {
    if (!isoString) return ''
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const participantNameMap = useMemo(() => {
    const map = new Map()
    for (const m of messages) {
      if (m.sender_id && m.sender_name && m.sender_name !== 'Contact' && m.sender_name !== '1289') {
        const userPart = m.sender_id.replace(/@s\.whatsapp\.net|@g\.us|@lid/g, '')
        map.set(userPart, m.sender_name)
        map.set(m.sender_id, m.sender_name)
      }
    }
    return map
  }, [messages])

  const formatParticipantsSubtitle = (participants) => {
    if (!participants || participants.length === 0) return 'Group conversation'
    const formatted = participants.map((p) => {
      if (participantNameMap.has(p)) {
        return participantNameMap.get(p)
      }
      const clean = p.replace(/@s\.whatsapp\.net|@g\.us|@lid/g, '')
      if (participantNameMap.has(clean)) {
        return participantNameMap.get(clean)
      }
      return formatSenderName(p, p)
    })
    return formatted.slice(0, 4).join(', ') + (formatted.length > 4 ? ` and ${formatted.length - 4} more...` : '')
  }

  const commonEmojis = ['👍', '❤️', '🙌', '🔥', '🎉', '😊', '🚀', '✅', '🙏', '💯']

  // Search & chat-isolated filtered messages sorted chronologically (oldest to newest)
  const displayedMessages = useMemo(() => {
    const cleanCurrentChat = chat?.id?.replace(/@s\.whatsapp\.net|@g\.us|@lid/g, '')
    const chatMsgs = (messages || []).filter((m) => {
      if (!m.chat_id || !cleanCurrentChat) return true
      const cleanMsg = m.chat_id.replace(/@s\.whatsapp\.net|@g\.us|@lid/g, '')
      return cleanMsg === cleanCurrentChat || m.chat_id === chat?.id
    })
    const filtered = !inChatSearchQuery.trim()
      ? chatMsgs
      : chatMsgs.filter(
          (m) =>
            m.content?.toLowerCase().includes(inChatSearchQuery.toLowerCase()) ||
            m.sender_name?.toLowerCase().includes(inChatSearchQuery.toLowerCase()),
        )
    return [...filtered].sort(
      (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime(),
    )
  }, [messages, inChatSearchQuery, chat?.id])

  // Helper to find replying-to message object
  const getQuotedMessage = (replyId) => {
    if (!replyId) return null
    return messages.find((m) => m.id === replyId)
  }

  return (
    <div className="whatsapp-main">
      {/* Toast */}
      {copiedToast && (
        <div className="whatsapp-toast">
          Copied to clipboard
        </div>
      )}

      {/* Header */}
      <div className="whatsapp-main-header">
        <div className="whatsapp-contact-header">
          <div className={`whatsapp-avatar ${isEve ? 'is-eve' : chat?.is_group ? 'is-group' : ''}`}>
            {isEve ? (
              <Bot size={22} />
            ) : chat?.avatar_url ? (
              <img
                src={chat.avatar_url}
                alt={chat.name}
                className="whatsapp-avatar-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  if (e.currentTarget.nextSibling) {
                    e.currentTarget.nextSibling.style.display = 'flex'
                  }
                }}
              />
            ) : null}
            {!isEve && (
              <div
                className="whatsapp-avatar-fallback"
                style={chat?.avatar_url ? { display: 'none' } : {}}
              >
                {chat?.name && chat.name !== 'Contact' && chat.name !== chat.id ? (
                  <span className="whatsapp-avatar-initial">{getSenderInitial(chat.name)}</span>
                ) : chat?.is_group ? (
                  <Users size={20} />
                ) : (
                  <User size={20} />
                )}
              </div>
            )}
          </div>
          <div className="whatsapp-contact-details">
            <h3 title={chat?.name}>
              {chat?.is_group && (!chat?.name || chat?.name === 'Contact' || chat?.name === chat?.id)
                ? 'Group conversation'
                : chat?.name || 'Conversation'}
            </h3>
            <span className="whatsapp-contact-subtitle" title={chat?.participants?.join(', ')}>
              {isEve
                ? 'AI Workspace Assistant • Always active'
                : chat?.is_group
                ? formatParticipantsSubtitle(chat.participants)
                : chat?.phone_number || 'Online'}
            </span>
          </div>
        </div>

        <div className="whatsapp-header-actions">
          {/* Audio Call */}
          <button
            type="button"
            className="whatsapp-icon-btn"
            title="Audio call"
            onClick={() => alert(`Starting audio call with ${chat?.name}...`)}
          >
            <Phone size={16} />
          </button>

          {/* Video Call */}
          <button
            type="button"
            className="whatsapp-icon-btn"
            title="Video call"
            onClick={() => alert(`Starting video call with ${chat?.name}...`)}
          >
            <Video size={16} />
          </button>

          {/* Search in chat */}
          <button
            type="button"
            className={`whatsapp-icon-btn ${isSearchOpen ? 'active' : ''}`}
            title="Search in chat"
            onClick={() => {
              setIsSearchOpen((prev) => !prev)
              if (isSearchOpen) setInChatSearchQuery('')
            }}
          >
            <Search size={16} />
          </button>

          {/* Eve Summarize */}
          <button
            type="button"
            className="secondary-button"
            style={{ minHeight: '34px', padding: '6px 12px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => onSummarizeChat?.(chat?.id)}
            title="Summarize conversation with Eve"
          >
            <Sparkles size={14} />
            Summarize
          </button>

          {/* Chat Info */}
          <button
            type="button"
            className="whatsapp-icon-btn"
            onClick={onOpenInfoDrawer}
            title="Chat info & settings"
          >
            <Info size={16} />
          </button>
        </div>
      </div>

      {/* In-Chat Search Bar */}
      {isSearchOpen && (
        <div className="whatsapp-inchat-search-bar">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search in this conversation..."
            value={inChatSearchQuery}
            onChange={(e) => setInChatSearchQuery(e.target.value)}
            autoFocus
          />
          {inChatSearchQuery && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {displayedMessages.length} match{displayedMessages.length !== 1 ? 'es' : ''}
            </span>
          )}
          <button
            type="button"
            className="whatsapp-icon-btn small"
            onClick={() => {
              setIsSearchOpen(false)
              setInChatSearchQuery('')
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Messages Feed */}
      <div
        className="whatsapp-messages-feed"
        ref={messagesFeedRef}
        onScroll={handleFeedScroll}
      >
        {/* Loading Older Messages Spinner / Load Earlier Messages Button */}
        {isLoadingMore ? (
          <div className="whatsapp-loading-older">
            <div className="whatsapp-loading-spinner" />
            <span>Loading earlier messages...</span>
          </div>
        ) : hasMoreMessages && displayedMessages.length > 0 ? (
          <div className="whatsapp-loading-older-wrapper">
            <button
              type="button"
              className="whatsapp-load-more-btn"
              onClick={() => {
                if (messagesFeedRef.current) {
                  previousScrollHeightRef.current = messagesFeedRef.current.scrollHeight
                }
                onLoadMoreMessages?.()
              }}
            >
              Load earlier messages
            </button>
          </div>
        ) : null}

        {displayedMessages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '40px 20px', minHeight: '260px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
              {isEve ? <Bot size={20} /> : chat?.is_group ? <Users size={20} /> : <User size={20} />}
            </div>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
              No messages in this conversation yet
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, maxWidth: 320 }}>
              {isEve ? 'Ask Eve anything to get started.' : `Send a message below to start chatting with ${chat?.name || 'this contact'}.`}
            </p>
          </div>
        ) : (
          displayedMessages.map((msg) => {
            const isOutgoing = msg.is_from_me
            const isMsgEve = msg.is_eve || msg.sender_id === 'eve'
            const isHovered = hoveredMessageId === msg.id
            const isMenuOpen = activeMenuMessageId === msg.id
            const quotedMsg = getQuotedMessage(msg.reply_to_message_id)

            return (
              <div
                key={msg.id}
                className={`whatsapp-message-row ${isOutgoing ? 'outgoing' : 'incoming'}`}
              >
                {!isOutgoing && chat?.is_group && (
                  <div className="whatsapp-sender-avatar" title={msg.sender_name || 'Sender'}>
                    {msg.sender_avatar_url ? (
                      <img
                        src={msg.sender_avatar_url}
                        alt={msg.sender_name || 'Sender'}
                        className="whatsapp-sender-avatar-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          if (e.currentTarget.nextSibling) {
                            e.currentTarget.nextSibling.style.display = 'flex'
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className="whatsapp-sender-avatar-fallback"
                      style={msg.sender_avatar_url ? { display: 'none' } : {}}
                    >
                      {getSenderInitial(msg.sender_name || msg.sender_id)}
                    </div>
                  </div>
                )}
                <div
                  className={`whatsapp-message-wrapper ${
                    isOutgoing ? 'outgoing' : 'incoming'
                  } ${isMsgEve ? 'is-eve' : ''}`}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId((curr) => (curr === msg.id ? null : curr))}
                >
                  <div className="whatsapp-message-bubble-container">
                    {/* Message Options Menu Trigger on Hover */}
                    {(isHovered || isMenuOpen) && (
                      <div className="whatsapp-bubble-menu-container">
                        <button
                          type="button"
                          className="whatsapp-bubble-menu-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuMessageId((curr) => (curr === msg.id ? null : msg.id))
                          }}
                          title="Message menu"
                        >
                          <ChevronDown size={14} />
                        </button>

                        {/* Context Dropdown Menu */}
                        {isMenuOpen && (
                          <div className="whatsapp-context-menu" ref={menuRef}>
                          <button
                            type="button"
                            className="whatsapp-context-item"
                            onClick={() => {
                              setInfoModalMessage(msg)
                              setActiveMenuMessageId(null)
                            }}
                          >
                            <Info size={15} />
                            <span>Message info</span>
                          </button>

                          <button
                            type="button"
                            className="whatsapp-context-item"
                            onClick={() => {
                              setReplyingTo(msg)
                              setActiveMenuMessageId(null)
                            }}
                          >
                            <CornerUpLeft size={15} />
                            <span>Reply</span>
                          </button>

                          <button
                            type="button"
                            className="whatsapp-context-item"
                            onClick={() => handleCopyMessage(msg.content)}
                          >
                            <Copy size={15} />
                            <span>Copy</span>
                          </button>

                          <button
                            type="button"
                            className="whatsapp-context-item"
                            onClick={() => {
                              onReactToMessage?.(chat.id, msg.id, '👍')
                              setActiveMenuMessageId(null)
                            }}
                          >
                            <Smile size={15} />
                            <span>React (👍)</span>
                          </button>

                          <button
                            type="button"
                            className="whatsapp-context-item"
                            onClick={() => {
                              setActiveMenuMessageId(null)
                              setInputText(`Forwarded: ${msg.content}`)
                              setCopiedToast('Message copied to composer for forwarding')
                              setTimeout(() => setCopiedToast(false), 2000)
                            }}
                          >
                            <Share2 size={15} />
                            <span>Forward</span>
                          </button>

                          <button
                            type="button"
                            className="whatsapp-context-item"
                            onClick={() => {
                              setActiveMenuMessageId(null)
                              setCopiedToast(msg.is_pinned ? 'Message unpinned' : 'Message pinned')
                              setTimeout(() => setCopiedToast(false), 2000)
                            }}
                          >
                            <Pin size={15} />
                            <span>{msg.is_pinned ? 'Unpin' : 'Pin'}</span>
                          </button>

                          <button
                            type="button"
                            className="whatsapp-context-item eve-action"
                            onClick={() => handleAskEveAboutMessage(msg)}
                          >
                            <Sparkles size={15} />
                            <span>Ask Eve AI</span>
                          </button>

                          <button
                            type="button"
                            className="whatsapp-context-item"
                            onClick={() => {
                              onStarMessage?.(chat.id, msg.id, !msg.is_starred)
                              setActiveMenuMessageId(null)
                            }}
                          >
                            <Star size={15} fill={msg.is_starred ? 'currentColor' : 'none'} />
                            <span>{msg.is_starred ? 'Unstar' : 'Star'}</span>
                          </button>

                          <button
                            type="button"
                            className="whatsapp-context-item danger"
                            onClick={() => {
                              onDeleteMessage?.(chat.id, msg.id)
                              setActiveMenuMessageId(null)
                            }}
                          >
                            <Trash2 size={15} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Message Bubble with Right-Click Context Menu Trigger */}
                  <div
                    className="whatsapp-message-bubble"
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setActiveMenuMessageId(msg.id)
                    }}
                  >
                    {/* Sender Name in Group */}
                    {!isOutgoing && chat?.is_group && (
                      <div className="whatsapp-sender-name">
                        {formatSenderName(msg.sender_name, msg.sender_id)}
                      </div>
                    )}

                    {/* Forwarded Tag */}
                    {(msg.is_forwarded || msg.isForwarded) && (
                      <div className="whatsapp-forwarded-tag">
                        <CornerUpLeft size={13} style={{ transform: 'scaleX(-1)' }} />
                        <span>Forwarded</span>
                      </div>
                    )}

                    {/* Quoted Reply Preview */}
                    {quotedMsg && (
                      <div className="whatsapp-quoted-preview">
                        <span className="whatsapp-quoted-sender">
                          {quotedMsg.is_from_me ? 'You' : formatSenderName(quotedMsg.sender_name, quotedMsg.sender_id)}
                        </span>
                        <p className="whatsapp-quoted-text">{quotedMsg.content}</p>
                      </div>
                    )}

                    {/* Media Presentation */}
                    {msg.media?.type === 'audio' ? (
                      <div className="whatsapp-audio-player">
                        <button
                          type="button"
                          className="whatsapp-audio-btn"
                          onClick={() => handleToggleAudio(msg.id)}
                        >
                          {playingAudioId === msg.id ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <div className="whatsapp-audio-wave">
                          {[12, 18, 8, 22, 14, 20, 10, 16, 24, 12, 18, 14, 20, 8].map((h, i) => (
                            <div
                              key={i}
                              className="whatsapp-wave-bar"
                              style={{
                                height: `${h}px`,
                                opacity: playingAudioId === msg.id ? (i % 2 === 0 ? 1 : 0.6) : 0.5,
                              }}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>0:08</span>
                      </div>
                    ) : (msg.media && (msg.media.thumbnail_base64 || ['image', 'gif', 'video', 'sticker'].includes(msg.media.type) || msg.media.url)) ? (
                      <div className={`whatsapp-media-preview-container ${msg.media.type === 'sticker' ? 'is-sticker' : ''}`}>
                        {msg.media.thumbnail_base64 || (msg.media.url && (msg.media.url.startsWith('data:') || msg.media.url.startsWith('blob:') || msg.media.url.startsWith('/') || msg.media.url.includes('giphy.com') || msg.media.url.includes('tenor.com'))) ? (
                          <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                            <img
                              src={msg.media.thumbnail_base64 || msg.media.url}
                              alt={msg.media.filename || "Media attachment"}
                              className="whatsapp-media-preview-img"
                              onError={(e) => {
                                e.currentTarget.parentElement.style.display = 'none'
                              }}
                            />
                            {msg.media.type === 'gif' && (
                              <span className="whatsapp-gif-badge">GIF</span>
                            )}
                            {msg.media.type === 'video' && (
                              <div className="whatsapp-video-overlay">
                                <Play size={20} fill="white" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="whatsapp-media-placeholder">
                            {msg.media.type === 'gif' ? (
                              <span className="whatsapp-gif-badge">GIF</span>
                            ) : msg.media.type === 'video' ? (
                              <Play size={20} />
                            ) : (
                              <FileText size={20} />
                            )}
                            <span>{msg.media.filename || `${(msg.media.type || 'Media').toUpperCase()} Attachment`}</span>
                          </div>
                        )}
                      </div>
                    ) : msg.media?.type === 'document' ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 10px',
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: 6,
                          marginBottom: 6,
                        }}
                      >
                        <FileText size={18} />
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{msg.media.filename || 'Document'}</span>
                      </div>
                    ) : null}

                    {/* Content */}
                    {msg.content && (
                      <div className="whatsapp-message-text">
                        <Markdown content={formatMessageContent(msg.content)} />
                      </div>
                    )}

                    {/* Meta: Star, Timestamp & Delivery Status */}
                    <div className="whatsapp-message-meta">
                      {msg.is_starred && (
                        <Star size={11} fill="currentColor" style={{ opacity: 0.8 }} />
                      )}
                      <span>{formatMessageTime(msg.timestamp)}</span>
                      {isOutgoing && (
                        <span>
                          {msg.status === 'read' ? (
                            <CheckCheck size={14} />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck size={14} style={{ opacity: 0.6 }} />
                          ) : (
                            <Check size={14} />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Emoji Reactions List Attached to Bubble */}
                  {(() => {
                    const rxSummary = formatReactions(msg.reactions)
                    if (!rxSummary) return null
                    return (
                      <div className="whatsapp-reactions-badge-list">
                        <div
                          className="whatsapp-reaction-pill"
                          title={(msg.reactions || []).map((r) => `${r.sender || 'Someone'}: ${r.emoji}`).join('\n')}
                        >
                          <span className="whatsapp-reaction-emojis">{rxSummary.emojis.join(' ')}</span>
                          {rxSummary.totalCount > 1 && (
                            <span className="whatsapp-reaction-count">{rxSummary.totalCount}</span>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )
        })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Eve Suggestion Bar (if not Eve conversation) */}
      {!isEve && (
        <div className="whatsapp-eve-prompt-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <Bot size={16} />
            <span>Need assistance responding?</span>
          </div>
          <button
            type="button"
            className="whatsapp-eve-btn"
            onClick={handleApplyEveDraft}
            disabled={isDrafting}
          >
            <Sparkles size={12} />
            {isDrafting ? 'Drafting reply...' : 'Ask Eve to draft reply'}
          </button>
        </div>
      )}

      {/* Quoted Reply Banner */}
      {replyingTo && (
        <div className="whatsapp-replying-banner">
          <div className="whatsapp-replying-content">
            <span className="whatsapp-replying-title">
              Replying to {replyingTo.is_from_me ? 'yourself' : replyingTo.sender_name || 'Contact'}
            </span>
            <p className="whatsapp-replying-text">{replyingTo.content}</p>
          </div>
          <button
            type="button"
            className="whatsapp-icon-btn small"
            onClick={() => setReplyingTo(null)}
            title="Cancel reply"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Emoji Bar */}
      {showEmojiPicker && (
        <div className="whatsapp-emoji-tray">
          {commonEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="whatsapp-emoji-btn"
              onClick={() => setInputText((prev) => prev + emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form className="whatsapp-composer" onSubmit={handleSend}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        <button
          type="button"
          className="whatsapp-icon-btn"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          title="Emojis"
        >
          <Smile size={18} />
        </button>

        <button
          type="button"
          className="whatsapp-icon-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Attach media or document"
        >
          <Paperclip size={18} />
        </button>

        <input
          type="text"
          className="whatsapp-composer-input"
          placeholder={
            isRecording
              ? 'Recording voice note...'
              : isEve
              ? 'Message Eve or request workspace actions...'
              : 'Type a message...'
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRecording}
        />

        <button
          type="button"
          className={`whatsapp-icon-btn ${isRecording ? 'recording' : ''}`}
          onClick={handleSimulateVoiceNote}
          title={isRecording ? 'Stop & send voice note' : 'Record voice note'}
          style={isRecording ? { background: 'var(--text-primary)', color: 'var(--bg-primary)' } : {}}
        >
          {isRecording ? <Square size={16} /> : <Mic size={18} />}
        </button>

        <button
          type="submit"
          className="whatsapp-send-btn"
          disabled={!inputText.trim()}
          title="Send message"
        >
          <Send size={16} />
        </button>
      </form>

      {/* Message Info Modal */}
      {infoModalMessage && (
        <div className="whatsapp-info-modal-backdrop" onClick={() => setInfoModalMessage(null)}>
          <div className="whatsapp-info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="whatsapp-info-modal-header">
              <h3>Message Info</h3>
              <button
                type="button"
                className="whatsapp-icon-btn small"
                onClick={() => setInfoModalMessage(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="whatsapp-info-modal-body">
              <div className="whatsapp-info-row">
                <span className="info-label">Sender</span>
                <span className="info-value">{infoModalMessage.is_from_me ? 'You' : infoModalMessage.sender_name || 'Contact'}</span>
              </div>
              <div className="whatsapp-info-row">
                <span className="info-label">Sent</span>
                <span className="info-value">{new Date(infoModalMessage.timestamp).toLocaleString()}</span>
              </div>
              <div className="whatsapp-info-row">
                <span className="info-label">Status</span>
                <span className="info-value" style={{ textTransform: 'capitalize' }}>{infoModalMessage.status || 'Delivered'}</span>
              </div>
              <div className="whatsapp-info-row">
                <span className="info-label">Length</span>
                <span className="info-value">{infoModalMessage.content?.length || 0} characters</span>
              </div>
              <div className="whatsapp-info-preview-box">
                <p>{infoModalMessage.content}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
