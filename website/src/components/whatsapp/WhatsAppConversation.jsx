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
} from 'lucide-react'

export function WhatsAppConversation({
  chat,
  messages = [],
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

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const menuRef = useRef(null)

  const isEve = chat?.is_eve || chat?.id === 'eve'

  // Scroll to bottom on new message if not searching
  const scrollToBottom = () => {
    if (!isSearchOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    scrollToBottom()
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

  const formatParticipantsSubtitle = (participants) => {
    if (!participants || participants.length === 0) return 'Group conversation'
    return participants.slice(0, 8).join(', ') + (participants.length > 8 ? ` and ${participants.length - 8} more...` : '')
  }

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏']
  const commonEmojis = ['👍', '❤️', '🙌', '🔥', '🎉', '😊', '🚀', '✅', '🙏', '💯']

  // Search filtered messages
  const displayedMessages = useMemo(() => {
    if (!inChatSearchQuery.trim()) return messages
    const q = inChatSearchQuery.toLowerCase()
    return messages.filter(
      (m) =>
        m.content?.toLowerCase().includes(q) ||
        m.sender_name?.toLowerCase().includes(q)
    )
  }, [messages, inChatSearchQuery])

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
            {isEve ? <Bot size={22} /> : chat?.is_group ? <Users size={20} /> : <User size={20} />}
          </div>
          <div className="whatsapp-contact-details">
            <h3 title={chat?.name}>{chat?.name || 'Conversation'}</h3>
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
      <div className="whatsapp-messages-feed">
        {displayedMessages.map((msg) => {
          const isOutgoing = msg.is_from_me
          const isMsgEve = msg.is_eve || msg.sender_id === 'eve'
          const isHovered = hoveredMessageId === msg.id
          const isMenuOpen = activeMenuMessageId === msg.id
          const quotedMsg = getQuotedMessage(msg.reply_to_message_id)

          return (
            <div
              key={msg.id}
              className={`whatsapp-message-wrapper ${
                isOutgoing ? 'outgoing' : 'incoming'
              } ${isMsgEve ? 'is-eve' : ''}`}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId((curr) => (curr === msg.id ? null : curr))}
            >
              <div className="whatsapp-message-bubble-container">
                {/* Floating Quick Action & Reaction Bar on Hover */}
                {(isHovered || isMenuOpen) && (
                  <div className="whatsapp-message-action-bar">
                    {/* Quick Reactions */}
                    <div className="whatsapp-quick-reactions">
                      {quickReactions.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="whatsapp-reaction-btn"
                          onClick={() => onReactToMessage?.(chat.id, msg.id, emoji)}
                          title={`React ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    {/* Dropdown Menu Trigger */}
                    <button
                      type="button"
                      className="whatsapp-action-menu-btn"
                      onClick={() => setActiveMenuMessageId((curr) => (curr === msg.id ? null : msg.id))}
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
                            setReplyingTo(msg)
                            setActiveMenuMessageId(null)
                          }}
                        >
                          <CornerUpLeft size={14} />
                          Reply
                        </button>

                        <button
                          type="button"
                          className="whatsapp-context-item"
                          onClick={() => handleCopyMessage(msg.content)}
                        >
                          <Copy size={14} />
                          Copy
                        </button>

                        <button
                          type="button"
                          className="whatsapp-context-item"
                          onClick={() => {
                            onStarMessage?.(chat.id, msg.id, !msg.is_starred)
                            setActiveMenuMessageId(null)
                          }}
                        >
                          <Star size={14} fill={msg.is_starred ? 'currentColor' : 'none'} />
                          {msg.is_starred ? 'Unstar' : 'Star'}
                        </button>

                        <button
                          type="button"
                          className="whatsapp-context-item eve-action"
                          onClick={() => handleAskEveAboutMessage(msg)}
                        >
                          <Sparkles size={14} />
                          Ask Eve AI
                        </button>

                        <button
                          type="button"
                          className="whatsapp-context-item danger"
                          onClick={() => {
                            onDeleteMessage?.(chat.id, msg.id)
                            setActiveMenuMessageId(null)
                          }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Main Message Bubble */}
                <div className="whatsapp-message-bubble">
                  {/* Forwarded Tag */}
                  {msg.is_forwarded && (
                    <div className="whatsapp-forwarded-tag">
                      <Share2 size={12} />
                      <span>Forwarded</span>
                    </div>
                  )}

                  {/* Sender Name in Group */}
                  {!isOutgoing && chat?.is_group && (
                    <div className="whatsapp-sender-name">
                      {msg.sender_name || 'Contact'}
                    </div>
                  )}

                  {/* Quoted Reply Preview */}
                  {quotedMsg && (
                    <div className="whatsapp-quoted-preview">
                      <span className="whatsapp-quoted-sender">
                        {quotedMsg.is_from_me ? 'You' : quotedMsg.sender_name || 'Contact'}
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
                  ) : msg.media?.type === 'image' ? (
                    <div style={{ marginBottom: 6, borderRadius: 8, overflow: 'hidden', maxHeight: 240 }}>
                      <img src={msg.media.url} alt="Attachment" style={{ width: '100%', objectFit: 'cover' }} />
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
                  {msg.content && <div className="whatsapp-message-text">{msg.content}</div>}

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

                {/* Emoji Reactions List Below Bubble */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="whatsapp-reactions-badge-list">
                    {msg.reactions.map((r, i) => (
                      <span key={i} className="whatsapp-reaction-pill">
                        {r.emoji} {r.count > 1 ? r.count : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
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
    </div>
  )
}
