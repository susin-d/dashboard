import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, Maximize2, MoreVertical, Send, X } from 'lucide-react'
import { sendEveMessage } from '../lib/eveApi'

const STARTER_MESSAGES = [{
  role: 'assistant',
  content: 'Hi, I’m Eve. I can read, create, and update your tasks, projects, jobs, and documents.',
}]

export function EveAssistantModal({ isOpen, onClose, onWorkspaceChanged }) {
  const [messages, setMessages] = useState(STARTER_MESSAGES)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const panelRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!isOpen) return undefined

    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    window.requestAnimationFrame(() => {
      panelRef.current?.querySelector('[data-eve-initial-focus]')?.focus()
    })

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [isOpen, onClose])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || isSending) return
    const nextMessages = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setDraft('')
    setError('')
    setIsSending(true)
    try {
      const response = await sendEveMessage(nextMessages)
      setMessages((current) => [...current, { role: 'assistant', content: response.message }])
      if (response.changed_resources.length) onWorkspaceChanged()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="eve-panel-backdrop" onMouseDown={onClose} role="presentation">
      <aside
        ref={panelRef}
        className={`eve-assistant-panel ${isWide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-dialog-managed="true"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="eve-panel-header">
          <div>
            <p id={descriptionId}>Your workspace copilot</p>
            <h2 id={titleId}>Eve AI assistant</h2>
          </div>
          <div className="eve-panel-controls">
            <span className="eve-panel-control-icon" aria-hidden="true">
              <MoreVertical size={18} />
            </span>
            <button className="icon-button" type="button" onClick={() => setIsWide((wide) => !wide)} aria-label={isWide ? 'Reduce Eve assistant width' : 'Expand Eve assistant'}>
              <Maximize2 size={17} />
            </button>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close Eve assistant" data-eve-initial-focus>
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="eve-panel-body">
          <div className="eve-intro"><Bot size={18} aria-hidden="true" /><span>Eve only works with the records in your StarWaves account.</span></div>
          <div className="eve-messages" aria-live="polite" aria-label="Eve conversation">
            {messages.map((message, index) => <p className={`eve-message ${message.role}`} key={`${message.role}-${index}`}>{message.content}</p>)}
            {isSending && <p className="eve-message assistant">Eve is working...</p>}
          </div>
          {error && <p className="eve-error" role="alert">{error}</p>}
        </div>

        <form className="eve-composer" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="eve-message">Message Eve</label>
          <textarea id="eve-message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type / to use skills" rows="3" maxLength="4000" disabled={isSending} />
          <button className="primary-button" type="submit" disabled={!draft.trim() || isSending}><Send size={15} />Send</button>
        </form>
      </aside>
    </div>,
    document.body,
  )
}
