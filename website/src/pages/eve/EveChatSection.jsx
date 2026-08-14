import { useRef, useEffect } from 'react'
import {
  Bot,
  ListPlus,
  Play,
  Send,
  Info,
  X,
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
  const charProgress = draft.length / MAX_CHARS

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

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

      {/* Composer Form */}
      <form className="eve-page-composer" onSubmit={handleSubmit}>
        <div className="eve-composer-inner">
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
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Ask Eve anything… Type @ to call a tool or / for a pre-saved prompt"
            rows={3}
            maxLength={MAX_CHARS}
          />

          <div className="eve-composer-bar">
            <div className="eve-composer-actions">
              {promptQueue.length > 0 && (
                <button
                  type="button"
                  className="eve-queue-run"
                  onClick={runQueue}
                  disabled={isSending}
                >
                  <Play size={13} />
                  Run queue ({promptQueue.length})
                </button>
              )}
              <button
                type="button"
                className="eve-queue-add"
                onClick={addToQueue}
                disabled={!draft.trim()}
                aria-label="Add message to queue"
                title="Add to queue"
              >
                <ListPlus size={16} />
              </button>
              <button
                type="submit"
                className="eve-send-btn"
                disabled={!draft.trim()}
                aria-label={isSending ? 'Queue message' : 'Send message to Eve'}
              >
                <Send size={15} />
                <span>{isSending ? 'Queue' : 'Send'}</span>
              </button>
            </div>
          </div>
          <div
            className="eve-progress-indicator"
            style={{ width: `${charProgress * 100}%` }}
          />
        </div>
        {promptQueue.length > 0 && (
          <div className="eve-queue-strip" aria-label="Queued messages">
            <div className="eve-queue-list">
              {promptQueue.map((queuedPrompt, index) => (
                <span className="eve-queue-item" key={`${queuedPrompt}-${index}`}>
                  <span className="eve-queue-item-text">{queuedPrompt}</span>
                  <button
                    className="eve-queue-item-remove"
                    type="button"
                    onClick={() => removeFromQueue(index)}
                    aria-label="Remove queued message"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <button className="eve-queue-clear" type="button" onClick={clearQueue}>
              Clear queue
            </button>
          </div>
        )}
      </form>
    </main>
  )
}
