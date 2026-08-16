import { useEffect, useRef, useState } from 'react'
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
} from 'lucide-react'

export function WhatsAppConversation({
  chat,
  messages = [],
  onSendMessage,
  onOpenInfoDrawer,
  onGenerateEveDraft,
  onSummarizeChat,
  isDrafting = false,
}) {
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [playingAudioId, setPlayingAudioId] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const isEve = chat?.is_eve || chat?.id === 'eve'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = (e) => {
    e?.preventDefault()
    if (!inputText.trim()) return
    onSendMessage({
      chatId: chat.id,
      content: inputText.trim(),
    })
    setInputText('')
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
        media: {
          type: 'audio',
          url: '',
          duration_seconds: 8.0,
          filename: 'voice_note.ogg',
        },
      })
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
        media: {
          type: isImg ? 'image' : 'document',
          url: uploadEvent.target.result,
          filename: file.name,
          file_size_bytes: file.size,
          mimetype: file.type,
        },
      })
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

  const formatMessageTime = (isoString) => {
    if (!isoString) return ''
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const commonEmojis = ['👍', '❤️', '🙌', '🔥', '🎉', '😊', '🚀', '✅']

  return (
    <div className="whatsapp-main">
      {/* Header */}
      <div className="whatsapp-main-header">
        <div className="whatsapp-contact-header">
          <div className={`whatsapp-avatar ${isEve ? 'is-eve' : ''}`}>
            {isEve ? <Bot size={22} /> : chat.is_group ? <Users size={20} /> : <User size={20} />}
          </div>
          <div className="whatsapp-contact-details">
            <h3>{chat.name}</h3>
            <span className="whatsapp-contact-subtitle">
              {isEve
                ? 'AI Workspace Assistant • Always active'
                : chat.phone_number || (chat.is_group ? 'Group conversation' : 'Online')}
            </span>
          </div>
        </div>

        <div className="whatsapp-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}
            onClick={() => onSummarizeChat?.(chat.id)}
            title="Summarize conversation with Eve"
          >
            <Sparkles size={14} />
            Summarize
          </button>
          <button
            type="button"
            className="whatsapp-icon-btn"
            onClick={onOpenInfoDrawer}
            title="Chat info"
          >
            <Info size={18} />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="whatsapp-messages-feed">
        {messages.map((msg) => {
          const isOutgoing = msg.is_from_me
          const isMsgEve = msg.is_eve || msg.sender_id === 'eve'

          return (
            <div
              key={msg.id}
              className={`whatsapp-message-wrapper ${
                isOutgoing ? 'outgoing' : 'incoming'
              } ${isMsgEve ? 'is-eve' : ''}`}
            >
              <div className="whatsapp-message-bubble">
                {!isOutgoing && chat.is_group && (
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, opacity: 0.8 }}>
                    {msg.sender_name || 'Contact'}
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
                {msg.content && <div>{msg.content}</div>}

                {/* Meta */}
                <div className="whatsapp-message-meta">
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

      {/* Emoji Bar */}
      {showEmojiPicker && (
        <div
          style={{
            padding: '8px 16px',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '12px',
          }}
        >
          {commonEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setInputText((prev) => prev + emoji)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
              }}
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
          placeholder={isRecording ? 'Recording voice note...' : isEve ? 'Message Eve or request workspace actions...' : 'Type a message...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRecording}
        />

        <button
          type="button"
          className={`whatsapp-icon-btn ${isRecording ? 'btn-danger' : ''}`}
          onClick={handleSimulateVoiceNote}
          title={isRecording ? 'Stop & send voice note' : 'Record voice note'}
          style={isRecording ? { background: '#ffffff', color: '#000000' } : {}}
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
