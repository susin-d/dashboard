import { useRef, useEffect, useState } from 'react'
import {
  ListPlus,
  Send,
  Info,
  Plus,
  Mic,
  MicOff,
  Paperclip,
  X,
  FileText,
  Loader2,
  Square,
  Wrench,
  GripVertical,
  Clock,
  Edit3,
  ChevronDown,
  ChevronUp,
  Eye,
  Check,
} from 'lucide-react'
import { Markdown } from '../../components/ui/Markdown'
import { ModelSelectorDropdown } from '../../components/ui/ModelSelectorDropdown'
import { formatFileSize } from '../../utils/fileSize'

const MAX_CHARS = 4000

function EveThoughtHistory({ thinking }) {
  const [open, setOpen] = useState(false)
  if (!thinking) return null
  const preview = thinking.length > 72 ? `${thinking.slice(0, 72)}…` : thinking
  return (
    <div className={`eve-thought-container ${open ? 'open' : 'collapsed'}`}>
      <button type="button" className="eve-thought-header" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="eve-thought-header-left">
          <Eye size={13} />
          <span>Thought</span>
          {!open && <span className="eve-thought-preview">{preview}</span>}
        </span>
        <span className="eve-thought-toggle" aria-hidden="true">
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>
      {open && <div className="eve-thought-content">{thinking}</div>}
    </div>
  )
}

export function EveChatSection({
  messages,
  draft,
  setDraft,
  isSending,
  streamText = '',
  thinkingText = '',
  toolCalls = [],
  activeTool = null,
  onStop,
  error,
  promptQueue,
  addToQueue,
  removeFromQueue,
  clearQueue: _clearQueue,
  runQueue: _runQueue,
  handleSubmit,
  matchingTools,
  matchingPrompts,
  selectTool,
  selectPrompt,
  EVE_PRESET_PROMPTS,
  aiProviders = [],
  activeModel,
  onSelectAiModel,
}) {
  const messagesEndRef = useRef(null)
  const composerRef = useRef(null)
  const fileInputRef = useRef(null)
  const [queueCollapsed, setQueueCollapsed] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [streamThoughtOpen, setStreamThoughtOpen] = useState(true)
  const recognitionRef = useRef(null)

  const charProgress = draft.length / MAX_CHARS

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending, streamText, thinkingText, toolCalls, activeTool])

  useEffect(() => {
    if (isSending && thinkingText) setStreamThoughtOpen(true)
  }, [isSending, thinkingText])

  const processFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return

    const readPromises = files.map((file) => {
      return new Promise((resolve) => {
        const isImage = file.type.startsWith('image/')
        const isText =
          file.type.startsWith('text/') ||
          /\.(txt|md|json|js|jsx|ts|tsx|html|css|py|csv|xml|yaml|yml|sql|sh|env|log|rs|go|java|c|cpp|h)$/i.test(file.name)

        const fileMeta = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          isImage,
        }

        if (isImage) {
          const reader = new FileReader()
          reader.onload = (e) => resolve({ ...fileMeta, dataUrl: e.target.result })
          reader.onerror = () => resolve(fileMeta)
          reader.readAsDataURL(file)
        } else if (isText || file.size < 500000) {
          const reader = new FileReader()
          reader.onload = (e) => {
            const text = String(e.target.result || '')
            const truncated = text.length > 40000 ? `${text.slice(0, 40000)}\n\n[...truncated]` : text
            resolve({ ...fileMeta, textContent: truncated })
          }
          reader.onerror = () => resolve(fileMeta)
          reader.readAsText(file)
        } else {
          resolve(fileMeta)
        }
      })
    })

    const loaded = await Promise.all(readPromises)
    setAttachments((prev) => [...prev, ...loaded])
    composerRef.current?.focus()
  }

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

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

  const onFormSubmit = (e) => {
    e?.preventDefault()
    if (!draft.trim() && attachments.length === 0) return
    handleSubmit(e, attachments)
    setAttachments([])
  }

  return (
    <main className="eve-chat-section">
      <div className="eve-messages-feed" role="log" aria-live="polite" aria-label="Eve AI conversation feed">
        {messages.map((msg, index) => (
          <div key={index} className={`eve-chat-bubble ${msg.role}`}>
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="eve-bubble-attachments">
                {msg.attachments.map((att) => (
                  <div key={att.id} className="eve-bubble-attachment-card">
                    {att.isImage && att.dataUrl ? (
                      <img src={att.dataUrl} alt={att.name} className="eve-bubble-attachment-thumb" />
                    ) : (
                      <div className="eve-bubble-attachment-icon-box">
                        <FileText size={14} />
                      </div>
                    )}
                    <div className="eve-bubble-attachment-meta">
                      <span className="eve-bubble-attachment-name" title={att.name}>{att.name}</span>
                      <span className="eve-bubble-attachment-size">{formatFileSize(att.size)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {msg.role === 'assistant' && msg.thinking && (
              <EveThoughtHistory thinking={msg.thinking} />
            )}
            {msg.role === 'assistant' && Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0 && (
              <div className="eve-tool-calls-container">
                {msg.toolCalls.map((tc) => (
                  <span key={tc.id || tc.name} className={`eve-tool-chip ${tc.status === 'running' ? 'running' : ''}`}>
                    {tc.status === 'done' ? <Check size={11} className="eve-tool-check" /> : <Wrench size={11} />}
                    <span className="eve-tool-chip-name">{tc.name}</span>
                    {tc.arguments && typeof tc.arguments === 'object' ? (
                      <span className="eve-tool-chip-args">{JSON.stringify(tc.arguments).slice(0, 80)}</span>
                    ) : tc.arguments ? (
                      <span className="eve-tool-chip-args">{String(tc.arguments).slice(0, 80)}</span>
                    ) : null}
                  </span>
                ))}
              </div>
            )}
            {msg.role === 'assistant' ? (
              <div className="eve-bubble-text eve-bubble-markdown">
                <Markdown content={msg.content} />
              </div>
            ) : (
              msg.content && <p className="eve-bubble-text">{msg.content}</p>
            )}
          </div>
        ))}

        {isSending && (
          <div className="eve-chat-bubble assistant sending" aria-live="polite" aria-busy="true">
            {thinkingText ? (
              <div className={`eve-thought-container live ${streamThoughtOpen ? 'open' : 'collapsed'}`}>
                <button
                  type="button"
                  className="eve-thought-header"
                  onClick={() => setStreamThoughtOpen((v) => !v)}
                  aria-expanded={streamThoughtOpen}
                  aria-label={streamThoughtOpen ? 'Collapse thinking' : 'Expand thinking'}
                >
                  <span className="eve-thought-header-left">
                    <Eye size={13} className={isSending && !streamText ? 'pulse' : ''} />
                    <span>{streamText ? 'Thought' : 'Thinking…'}</span>
                    {!streamThoughtOpen && thinkingText ? (
                      <span className="eve-thought-preview">{thinkingText.slice(0, 64).replace(/\n/g, ' ')}…</span>
                    ) : null}
                  </span>
                  <span className="eve-thought-toggle" aria-hidden="true">
                    {streamThoughtOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </span>
                </button>
                {streamThoughtOpen && (
                  <div className="eve-thought-content eve-thought-stream">
                    <span className="eve-thought-stream-text">{thinkingText}</span>
                    {!streamText && <span className="eve-thinking-cursor" aria-hidden="true" />}
                  </div>
                )}
              </div>
            ) : null}

            {toolCalls.length > 0 && (
              <div className="eve-tool-calls-container eve-tool-calls-live">
                {toolCalls.map((tc) => (
                  <span key={tc.id} className={`eve-tool-chip ${tc.status === 'running' ? 'running' : ''}`}>
                    {tc.status === 'done' ? <Check size={11} className="eve-tool-check" /> : <Loader2 size={11} className="spin" />}
                    <span className="eve-tool-chip-name">{tc.name}</span>
                    {tc.arguments ? (
                      <span className="eve-tool-chip-args">
                        {typeof tc.arguments === 'object' ? JSON.stringify(tc.arguments).slice(0, 60) : String(tc.arguments).slice(0, 60)}
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
            )}

            {streamText ? (
              <div className="eve-bubble-text eve-bubble-markdown eve-streaming-text">
                <Markdown content={streamText} />
                <span className="eve-streaming-cursor" aria-hidden="true" />
              </div>
            ) : activeTool ? (
              <div className="eve-tool-activity" role="status">
                <Loader2 size={13} className="spin" />
                <Wrench size={12} />
                <span>Using tool: {activeTool}…</span>
              </div>
            ) : !thinkingText ? (
              <div className="eve-typing-indicator" aria-label="Eve is thinking">
                <span />
                <span />
                <span />
              </div>
            ) : null}
          </div>
        )}

        {error && (() => {
          const isRate = /rate limit/i.test(error)
          const isAuth = /authentication|api key/i.test(error)
          const isModel = /model.*not found/i.test(error)
          const Icon = isRate ? Clock : Info
          const hint = isRate
            ? ' — please wait a moment, then retry or try a different model.'
            : isAuth
              ? ' — check Settings → AI Models.'
              : isModel
                ? ' — pick an available model in Settings.'
                : ''
          return (
            <div className={`eve-error-banner ${isRate ? 'eve-error-banner--rate' : isAuth ? 'eve-error-banner--auth' : ''}`} role="alert">
              <Icon size={16} />
              <span>{error}{hint}</span>
            </div>
          )
        })()}

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
                <span className="eve-queued-title">Queued messages {promptQueue.length}</span>
              </div>
              <div className="eve-queued-header-right">
                <span className="eve-queued-hint">Sends after agent finishes</span>
                <button
                  type="button"
                  className="eve-queue-collapse-btn"
                  onClick={() => setQueueCollapsed((c) => !c)}
                  aria-label={queueCollapsed ? 'Expand queued messages' : 'Collapse queued messages'}
                >
                  <Clock size={14} />
                </button>
              </div>
            </div>

            {!queueCollapsed && (
              <div className="eve-queued-list">
                {promptQueue.map((queuedPrompt, index) => (
                  <div className="eve-queued-item-row" key={`${queuedPrompt}-${index}`}>
                    <div className="eve-queued-item-preview">
                      <GripVertical size={14} className="eve-queued-grip" />
                      <span className="eve-queued-item-text">{queuedPrompt}</span>
                    </div>
                    <div className="eve-queued-item-actions">
                      <button
                        type="button"
                        className="eve-queue-pill-btn"
                        onClick={() => handleEditQueueItem(index)}
                        title="Edit prompt"
                      >
                        <Edit3 size={12} />
                        <span>edit</span>
                      </button>
                      <button
                        type="button"
                        className="eve-queue-pill-btn primary"
                        onClick={() => handleRunSingleQueueItem(index)}
                        disabled={isSending}
                        title="Send now"
                      >
                        <Send size={12} />
                        <span>send</span>
                      </button>
                      <button
                        type="button"
                        className="eve-queued-action-btn delete"
                        onClick={() => removeFromQueue(index)}
                        title="Delete from queue"
                        aria-label="Delete from queue"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Modern Composer Box ── */}
        <form
          className="eve-page-composer"
          onSubmit={onFormSubmit}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setIsDragging(false)
            }
          }}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            if (e.dataTransfer.files?.length) {
              processFiles(e.dataTransfer.files)
            }
          }}
        >
          <div className={`eve-composer-card ${isDragging ? 'dragging' : ''}`}>
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
                    onClick={() => {
                      selectTool(tool)
                      composerRef.current?.focus()
                    }}
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
                    onClick={() => {
                      selectPrompt(item)
                      composerRef.current?.focus()
                    }}
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

            {attachments.length > 0 && (
              <div className="eve-composer-attachments-row" aria-label="Attached files">
                {attachments.map((file) => (
                  <div key={file.id} className="eve-composer-attachment-chip">
                    {file.isImage && file.dataUrl ? (
                      <img src={file.dataUrl} alt={file.name} className="eve-attachment-thumb" />
                    ) : (
                      <Paperclip size={13} className="eve-attachment-icon" />
                    )}
                    <div className="eve-attachment-meta">
                      <span className="eve-attachment-name" title={file.name}>
                        {file.name}
                      </span>
                      <span className="eve-attachment-size">{formatFileSize(file.size)}</span>
                    </div>
                    <button
                      type="button"
                      className="eve-attachment-remove-btn"
                      onClick={() => removeAttachment(file.id)}
                      title={`Remove ${file.name}`}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              ref={composerRef}
              className="eve-composer-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && (draft.startsWith('@') || draft.startsWith('/'))) {
                  e.preventDefault()
                  setDraft('')
                } else if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onFormSubmit(e)
                }
              }}
              placeholder={
                attachments.length > 0
                  ? 'Add a prompt about the attached files (or press Enter to send)…'
                  : '@ for files/agents; / for commands and skills; ! for shell; # for snippets'
              }
              rows={2}
              maxLength={MAX_CHARS}
            />

            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) {
                  processFiles(e.target.files)
                  e.target.value = ''
                }
              }}
            />

            <div className="eve-composer-bottom-bar eve-composer-bottom-bar--dark">
              <div className="eve-composer-bottom-left">
                <button
                  type="button"
                  className="eve-bottom-pill-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Add files or documents"
                  aria-label="Add files"
                >
                  <Plus size={14} />
                </button>

                <ModelSelectorDropdown
                  direction="up"
                  activeModel={activeModel}
                  onSelectModel={onSelectAiModel}
                  providers={aiProviders}
                />
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

                {isSending ? (
                  <button
                    type="button"
                    className="eve-stop-btn eve-stop-btn--dark"
                    onClick={onStop}
                    title="Stop generating"
                    aria-label="Stop generating"
                  >
                    <Square size={12} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="eve-bottom-send-btn"
                    disabled={!draft.trim() && attachments.length === 0}
                    aria-label="Send message to Eve"
                    title="Send"
                  >
                    <Send size={15} />
                  </button>
                )}
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
