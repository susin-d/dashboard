import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Paperclip, Plus, X } from 'lucide-react'
import { CustomDropdown } from '../../components/ui'
import { formatFileSize } from '../../utils/fileSize'

const PROMPT_TEXTAREA_MAX_HEIGHT = 150
const ATTACHMENT_TEXT_MAX_LENGTH = 40000
const TEXT_EXTENSION_PATTERN = /\.(txt|md|json|js|jsx|ts|tsx|html|css|py|csv|xml|yaml|yml|sql|sh|log|rs|go|java|c|cpp|h)$/i

export function StudioHero({ templates = [], isSubmitting, onSubmitPrompt }) {
  const [prompt, setPrompt] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [attachments, setAttachments] = useState([])
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const templateOptions = [
    { value: '', label: 'Build' },
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
    event.preventDefault()
    if (!canSubmit) return
    try {
      await onSubmitPrompt(prompt.trim(), templateId, attachments)
      setPrompt('')
      setAttachments([])
    } catch {
      // Failure feedback is rendered by the parent; keep the prompt so nothing is lost.
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  return (
    <section className="studio-hero">
      <h1 className="studio-hero-title">Build something with Eve</h1>
      <p className="studio-hero-subtitle">
        Describe an app — Eve plans it, you approve, she builds it in an isolated workspace.
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
          placeholder="Ask Eve to build a habit tracker app…"
          rows={1}
          aria-label="Describe the app you want to build"
        />
        <input ref={fileInputRef} type="file" multiple hidden onChange={handleAddFiles} />
        <div className="studio-prompt-row">
          <button
            type="button"
            className="studio-prompt-attach"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={15} aria-hidden="true" />
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
            >
              <ArrowUp size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
