import { useRef, useEffect, useState } from 'react'
import {
  Bot,
  ListPlus,
  Play,
  Send,
  Info,
  Trash2,
  Pencil,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Mic,
  MicOff,
  Sparkles,
  MessageSquare,
} from 'lucide-react'
import { Markdown } from '../../components/ui/Markdown'

const MAX_CHARS = 4000

export function EveChatSection({
  messages,
  draft,
  setDraft,
  isSending,
  error,
  promptQueue,
  addToQueue,
  removeFromQueue,
  clearQueue,
  runQueue,
  handleSubmit,
  matchingTools,
  matchingPrompts,
  selectTool,
  selectPrompt,
  EVE_PRESET_PROMPTS,
}) {
  const messagesEndRef = useRef(null)
  const composerRef = useRef(null)
  const [queueCollapsed, setQueueCollapsed] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef(null)

  const charProgress = draft.length / MAX_CHARS

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  const handleEditQueueItem = (index) => {
    const item = promptQueue[index]
    if (item) {
      setDraft(item)
      removeFromQueue(index)
      composerRef.current?.focus()
    }
  }

  const handleRunSingleQueueItem = (index) => {
    const item = promptQueue[index]
    if (item) {
      removeFromQueue(index)
      setDraft(item)
      setTimeout(() => {
        const form = composerRef.current?.form
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
        }
      }, 0)
    }
  }

  const toggleVoiceRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice dictation is not supported by your current browser.')
      return
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => setIsRecording(true)
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript || ''
        if (transcript) {
          setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript))
        }
      }
      recognition.onerror = () => setIsRecording(false)
      recognition.onend = () => setIsRecording(false)

      recognitionRef.current = recognition
      recognition.start()
    } catch {
      setIsRecording(false)
    }
  }

  return (
    <main className="eve-chat-section">
      <div className="eve-messages-feed" role="log" aria-live="polite" aria-label="Eve AI conversation feed">
        {messages.map((msg, index) => (
          <div key={index} className={`eve-chat-bubble ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="eve-bubble-avatar">
                <Bot size={16} />
              </div>
            )}
            <div className="eve-bubble-content">
              <div className="eve-bubble-header">
                <span className="eve-sender-name">{msg.role === 'assistant' ? 'Eve' : 'You'}</span>
              </div>
              {msg.role === 'assistant' ? (
                <div className="eve-bubble-text eve-bubble-markdown">
                  <Markdown content={msg.content} />
                </div>
              ) : (
                <p className="eve-bubble-text">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="eve-chat-bubble assistant sending">
            <div className="eve-bubble-avatar">
              <Bot size={16} />
            </div>
            <div className="eve-bubble-content">
              <span className="eve-sender-name">Eve</span>
              <div className="eve-typing-indicator" aria-label="Eve is processing">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="eve-error-banner" role="alert">
            <Info size={16} />
            <span>{error}</span>
          </div>
        )}

        {messages.length <= 1 && (
          <div className="eve-starter-prompts">
            <p className="eve-starter-title">Quick prompts to get started:</p>
            <div className="eve-starter-grid">
              {EVE_PRESET_PROMPTS.slice(0, 6).map((item) => (
                <button
                  key={item.command}
                  type="button"
                  className="eve-starter-chip"
                  onClick={() => selectPrompt(item)}
                >
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer Section with Top Queued Messages */}
      <div className="eve-composer-container">
        {/* ── Queued Messages Box (Above Composer) ── */}
        {promptQueue.length > 0 && (
          <div className="eve-queued-panel" aria-label="Queued Messages">
            <div className="eve-queued-header">
              <div className="eve-queued-header-left">
                <span className="eve-queued-title">Queued Messages</span>
                <span className="eve-queued-badge">{promptQueue.length}</span>
                <span className="eve-queued-hint">Sends after agent finishes working</span>
              </div>
              <div className="eve-queued-header-right">
                <button
                  type="button"
                  className="eve-queue-btn-text"
                  onClick={runQueue}
                  disabled={isSending}
                  title="Run all queued messages"
                >
                  <Play size={13} />
                  <span>Run all</span>
                </button>
                <button
                  type="button"
                  className="eve-queue-btn-text"
                  onClick={clearQueue}
                  title="Clear entire queue"
                >
                  Clear queue
                </button>
                <button
                  type="button"
                  className="eve-queue-collapse-btn"
                  onClick={() => setQueueCollapsed((c) => !c)}
                  aria-label={queueCollapsed ? 'Expand queued messages' : 'Collapse queued messages'}
                >
                  {queueCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
            </div>

            {!queueCollapsed && (
              <div className="eve-queued-list">
                {promptQueue.map((queuedPrompt, index) => (
                  <div className="eve-queued-item-row" key={`${queuedPrompt}-${index}`}>
                    <div className="eve-queued-item-preview">
                      <MessageSquare size={14} className="eve-queued-item-icon" />
                      <span className="eve-queued-item-text">{queuedPrompt}</span>
                    </div>
                    <div className="eve-queued-item-actions">
                      <button
                        type="button"
                        className="eve-queued-action-btn"
                        onClick={() => handleRunSingleQueueItem(index)}
                        title="Send now"
                        aria-label="Send now"
                        disabled={isSending}
                      >
                        <ArrowRight size={14} />
                      </button>
                      <button
                        type="button"
                        className="eve-queued-action-btn"
                        onClick={() => handleEditQueueItem(index)}
                        title="Edit prompt"
                        aria-label="Edit prompt"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="eve-queued-action-btn delete"
                        onClick={() => removeFromQueue(index)}
                        title="Delete from queue"
                        aria-label="Delete from queue"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Modern Composer Box ── */}
        <form className="eve-page-composer" onSubmit={handleSubmit}>
          <div className="eve-composer-card">
            {draft.startsWith('@') && matchingTools.length > 0 && (
              <div className="eve-skills-popup" role="listbox" aria-label="Eve tools">
                <div className="eve-skills-popup-title">
                  Workspace Tools &amp; Resources <span>Type @ to reference</span>
                </div>
                {matchingTools.map((tool) => (
                  <button
                    type="button"
                    key={tool.command}
                    className="eve-skill-item"
                    onClick={() => selectTool(tool)}
                  >
                    <span className="eve-skill-cmd">@{tool.command}</span>
                    <div className="eve-skill-desc">
                      <strong>{tool.label}</strong>
                      <small>{tool.description}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {draft.startsWith('/') && matchingPrompts.length > 0 && (
              <div className="eve-skills-popup" role="listbox" aria-label="Eve pre-saved prompts">
                <div className="eve-skills-popup-title">
                  Pre-saved Prompts <span>Type / to filter</span>
                </div>
                {matchingPrompts.map((item) => (
                  <button
                    type="button"
                    key={item.command}
                    className="eve-skill-item"
                    onClick={() => selectPrompt(item)}
                  >
                    <span className="eve-skill-cmd">/{item.command}</span>
                    <div className="eve-skill-desc">
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <textarea
              ref={composerRef}
              className="eve-composer-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              placeholder="Ask Eve anything… Type @ to call a tool or / for a pre-saved prompt"
              rows={2}
              maxLength={MAX_CHARS}
            />

            <div className="eve-composer-bottom-bar">
              <div className="eve-composer-bottom-left">
                <button
                  type="button"
                  className="eve-bottom-pill-btn"
                  onClick={() => setDraft((d) => (d ? `${d} @` : '@'))}
                  title="Add workspace tool (@)"
                >
                  <Plus size={14} />
                </button>
                <div className="eve-model-tag">
                  <Sparkles size={13} />
                  <span>Eve AI Assistant</span>
                </div>
              </div>

              <div className="eve-composer-bottom-right">
                <button
                  type="button"
                  className="eve-bottom-icon-btn"
                  onClick={addToQueue}
                  disabled={!draft.trim()}
                  title="Add to queue"
                  aria-label="Add to queue"
                >
                  <ListPlus size={16} />
                </button>

                <button
                  type="button"
                  className={`eve-bottom-icon-btn ${isRecording ? 'recording' : ''}`}
                  onClick={toggleVoiceRecording}
                  title={isRecording ? 'Stop voice recording' : 'Dictate with voice'}
                  aria-label={isRecording ? 'Stop voice recording' : 'Dictate with voice'}
                >
                  {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                <button
                  type="submit"
                  className="eve-bottom-send-btn"
                  disabled={!draft.trim()}
                  aria-label={isSending ? 'Queue message' : 'Send message to Eve'}
                  title={isSending ? 'Queue message' : 'Send'}
                >
                  <Send size={15} />
                </button>
              </div>
            </div>

            <div
              className="eve-progress-indicator"
              style={{ width: `${charProgress * 100}%` }}
            />
          </div>
        </form>
      </div>
    </main>
  )
}
