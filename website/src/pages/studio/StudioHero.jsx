import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Paperclip, Plus, Sparkles, X } from 'lucide-react'
import { CustomDropdown } from '../../components/ui'
import { formatFileSize } from '../../utils/fileSize'

const PROMPT_TEXTAREA_MAX_HEIGHT = 160
const ATTACHMENT_TEXT_MAX_LENGTH = 40000
const TEXT_EXTENSION_PATTERN = /\.(txt|md|json|js|jsx|ts|tsx|html|css|py|csv|xml|yaml|yml|sql|sh|log|rs|go|java|c|cpp|h)$/i

const PROMPT_SUGGESTIONS = [
  {
    label: '📊 SaaS Dashboard',
    prompt: 'Build a SaaS Analytics Dashboard with key metric cards, revenue line charts, user activity feed, and date range filters.',
  },
  {
    label: '⚡ Kanban Board',
    prompt: 'Build an interactive Kanban task board with drag-and-drop columns, priority tags, task search, and activity log.',
  },
  {
    label: '💬 AI Chat Interface',
    prompt: 'Build a real-time AI Chat interface with conversation history sidebar, markdown rendering, and code syntax highlighting.',
  },
  {
    label: '🎯 Habit Tracker',
    prompt: 'Build a daily habit tracker with streak counters, weekly progress heatmaps, and customizable categories.',
  },
  {
    label: '🛒 E-commerce Store',
    prompt: 'Build a modern storefront with product catalogue, filtering by category and price, cart drawer, and checkout flow.',
  },
  {
    label: '📝 Notes Wiki',
    prompt: 'Build a markdown documentation wiki with nested page tree, search bar, table of contents, and dark mode support.',
  },
]

export function StudioHero({
  templates = [],
  isSubmitting,
  onSubmitPrompt,
}) {
  const [prompt, setPrompt] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [attachments, setAttachments] = useState([])
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const templateOptions = [
    { value: '', label: 'Blank Project' },
    ...templates.map((template) => ({ value: template.id, label: template.name })),
  ]

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, PROMPT_TEXTAREA_MAX_HEIGHT)}px`
  }, [prompt])

  const canSubmit = prompt.trim().length > 0 && !isSubmitting

  const handleAddFiles = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    files.forEach((file) => {
      const meta = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        size: file.size,
      }
      const isText = file.type.startsWith('text/') || TEXT_EXTENSION_PATTERN.test(file.name)
      if (!isText) {
        setAttachments((prev) => [...prev, meta])
        return
      }
      file
        .text()
        .then((text) => {
          const truncated = text.length > ATTACHMENT_TEXT_MAX_LENGTH
            ? `${text.slice(0, ATTACHMENT_TEXT_MAX_LENGTH)}\n\n[...truncated]`
            : text
          setAttachments((prev) => [...prev, { ...meta, textContent: truncated }])
        })
        .catch(() => {
          setAttachments((prev) => [...prev, meta])
        })
    })
    textareaRef.current?.focus()
  }

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((file) => file.id !== id))
  }

  const handleSubmit = async (event) => {
    event?.preventDefault?.()
    if (!canSubmit) return
    try {
      await onSubmitPrompt(prompt.trim(), templateId, attachments)
      setPrompt('')
      setAttachments([])
    } catch {
      // Failure feedback is handled by parent
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  const handleSuggestionClick = (suggestionPrompt) => {
    setPrompt(suggestionPrompt)
    textareaRef.current?.focus()
  }

  return (
    <section className="studio-hero">
      <div className="studio-hero-badge">
        <Sparkles size={13} aria-hidden="true" />
        AI Fullstack Studio
      </div>
      <h1 className="studio-hero-title">Build something with Eve</h1>
      <p className="studio-hero-subtitle">
        Describe an app idea or attach specifications — Eve plans the architecture, writes the code, and launches live previews.
      </p>

      <form className="studio-prompt-card" onSubmit={handleSubmit}>
        {attachments.length > 0 && (
          <div className="studio-prompt-attachments" aria-label="Attached files">
            {attachments.map((file) => (
              <span key={file.id} className="studio-prompt-attachment-chip">
                <Paperclip size={12} aria-hidden="true" />
                <span className="studio-prompt-attachment-name" title={file.name}>{file.name}</span>
                <span className="studio-prompt-attachment-size">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  className="studio-prompt-attachment-remove"
                  onClick={() => removeAttachment(file.id)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="studio-prompt-input"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Eve to build a SaaS dashboard, CRM, real-time chat, or habit tracker…"
          rows={2}
          aria-label="Describe the app you want to build"
        />
        <input ref={fileInputRef} type="file" multiple hidden onChange={handleAddFiles} />
        <div className="studio-prompt-row">
          <button
            type="button"
            className="studio-prompt-attach"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={14} aria-hidden="true" />
            Add files
          </button>
          <div className="studio-prompt-tools">
            <CustomDropdown
              className="studio-prompt-mode"
              value={templateId}
              options={templateOptions}
              onChange={setTemplateId}
              ariaLabel="Starter template"
            />
            <button
              type="submit"
              className="studio-prompt-submit"
              disabled={!canSubmit}
              aria-label="Create project from prompt"
              title="Create project (Enter)"
            >
              <ArrowUp size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>

      <div className="studio-suggestions" aria-label="Prompt suggestions">
        <span className="studio-suggestions-label">Try asking:</span>
        {PROMPT_SUGGESTIONS.map((item) => (
          <button
            key={item.label}
            type="button"
            className="studio-suggestion-chip"
            onClick={() => handleSuggestionClick(item.prompt)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  )
}
