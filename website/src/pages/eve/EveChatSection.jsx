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
  Check,
  Paperclip,
  X,
  FileText,
  Loader2,
  Square,
  Wrench,
} from 'lucide-react'
import { Markdown } from '../../components/ui/Markdown'

const MAX_CHARS = 4000

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function EveChatSection({
  messages,
  draft,
  setDraft,
  isSending,
  streamText = '',
  activeTool = null,
  onStop,
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
  aiProviders = [],
  activeModel,
  onSelectAiModel,
}) {
  const messagesEndRef = useRef(null)
  const composerRef = useRef(null)
  const fileInputRef = useRef(null)
  const [queueCollapsed, setQueueCollapsed] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [modelPickerOpen, setModelPickerOpen] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const modelPickerRef = useRef(null)
  const recognitionRef = useRef(null)

  const charProgress = draft.length / MAX_CHARS

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending, streamText, activeTool])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!modelPickerRef.current?.contains(event.target)) {
        setModelPickerOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setModelPickerOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

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

  const currentModelLabel = activeModel?.label || activeModel?.model || 'GPT-5 mini'

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
              {msg.role === 'assistant' ? (
                <div className="eve-bubble-text eve-bubble-markdown">
                  <Markdown content={msg.content} />
                </div>
              ) : (
                msg.content && <p className="eve-bubble-text">{msg.content}</p>
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
              {streamText ? (
                <div className="eve-bubble-text eve-bubble-markdown eve-streaming-text">
                  <Markdown content={streamText} />
                  <span className="eve-stream-caret" aria-hidden="true" />
                </div>
              ) : activeTool ? (
                <div className="eve-tool-activity" role="status">
                  <Loader2 size={13} className="spin" />
                  <Wrench size={12} />
                  <span>Using tool: {activeTool}…</span>
                </div>
              ) : (
                <div className="eve-typing-indicator" aria-label="Eve is thinking">
                  <span />
                  <span />
                  <span />
                </div>
              )}
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
                  : 'Ask Eve anything… Type @ for tools, / for prompts, or + to add files'
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

            <div className="eve-composer-bottom-bar">
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

                <div className="eve-model-selector-container" ref={modelPickerRef}>
                  <button
                    type="button"
                    className="eve-model-tag-btn"
                    onClick={() => setModelPickerOpen((open) => !open)}
                    aria-haspopup="listbox"
                    aria-expanded={modelPickerOpen}
                    title="Change AI model"
                  >
                    <Sparkles size={13} />
                    <span>{currentModelLabel}</span>
                    <ChevronDown size={13} className={`eve-model-chevron ${modelPickerOpen ? 'open' : ''}`} />
                  </button>

                  {modelPickerOpen && (
                    <div className="eve-model-menu-popup" role="listbox" aria-label="Select AI Model">
                      <div className="eve-model-menu-title">Select Active Model</div>
                      {(aiProviders.length > 0 ? aiProviders : [
                        {
                          id: 'openai',
                          label: 'OpenAI',
                          models: [
                            { id: 'gpt-5-mini', label: 'GPT-5 mini' },
                            { id: 'gpt-5', label: 'GPT-5' },
                            { id: 'gpt-4o', label: 'GPT-4o' },
                            { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
                            { id: 'o3-mini', label: 'o3 mini' },
                          ],
                        },
                        {
                          id: 'gemini',
                          label: 'Google Gemini',
                          models: [
                            { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
                            { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
                            { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
                          ],
                        },
                        {
                          id: 'anthropic',
                          label: 'Anthropic',
                          models: [
                            { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
                            { id: 'claude-opus-4-1', label: 'Claude Opus 4.1' },
                            { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
                          ],
                        },
                        {
                          id: 'openrouter',
                          label: 'OpenRouter',
                          models: [
                            { id: 'openai/gpt-4o', label: 'GPT-4o (via OpenRouter)' },
                            { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5 (via OpenRouter)' },
                            { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (via OpenRouter)' },
                            { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B (via OpenRouter)' },
                          ],
                        },
                        {
                          id: 'ollama',
                          label: 'Ollama (local)',
                          models: [
                            { id: 'llama3.1', label: 'Llama 3.1' },
                            { id: 'llama3.2', label: 'Llama 3.2' },
                            { id: 'qwen2.5', label: 'Qwen 2.5' },
                            { id: 'mistral', label: 'Mistral' },
                          ],
                        },
                        {
                          id: 'opencode',
                          label: 'OpenCode',
                          models: [
                            { id: 'opencode/gpt-5-mini', label: 'GPT-5 mini (via OpenCode)' },
                            { id: 'opencode/claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (via OpenCode)' },
                          ],
                        },
                      ]).map((prov) => (
                        <div key={prov.id} className="eve-model-menu-group">
                          <span className="eve-model-menu-group-label">{prov.label}</span>
                          {(prov.models || []).map((m) => {
                            const isSelected =
                              activeModel?.provider === prov.id && activeModel?.model === m.id
                            return (
                              <button
                                key={m.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`eve-model-menu-item ${isSelected ? 'active' : ''}`}
                                onClick={() => {
                                  onSelectAiModel?.(prov.id, m.id, m.label)
                                  setModelPickerOpen(false)
                                }}
                              >
                                <span>{m.label}</span>
                                {isSelected && <Check size={13} />}
                              </button>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="eve-composer-bottom-right">
                {isSending && (
                  <button
                    type="button"
                    className="eve-stop-btn"
                    onClick={onStop}
                    title="Stop generating"
                    aria-label="Stop generating"
                  >
                    <Square size={12} />
                    <span>Stop</span>
                  </button>
                )}

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
                  disabled={!draft.trim() && attachments.length === 0}
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
