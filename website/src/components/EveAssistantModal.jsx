import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, Maximize2, MoreVertical, Send, ShieldCheck, X } from 'lucide-react'
import { sendEveMessage } from '../lib/eveApi'

const STARTER_MESSAGES = [{
  role: 'assistant',
  content: 'Hi, I’m Eve. I can read, create, and update your workspace records. Use the Delete button when you need to remove something.',
}]

const EVE_SKILLS = [
  { command: 'today', label: 'Plan my day', description: 'Review tasks, deadlines, and calendar events' },
  { command: 'tasks', label: 'Manage tasks', description: 'Create, update, or find workspace todos' },
  { command: 'projects', label: 'Work with projects', description: 'Review project progress and next steps' },
  { command: 'jobs', label: 'Track applications', description: 'Find or update job application records' },
  { command: 'documents', label: 'Search documents', description: 'Find workspace documents and notes' },
  { command: 'calendar', label: 'Check calendar', description: 'Look up events, contests, and deadlines' },
]

export function EveAssistantModal({ isOpen, onClose, onNavigate, onWorkspaceChanged }) {
  const [messages, setMessages] = useState(STARTER_MESSAGES)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const panelRef = useRef(null)
  const composerRef = useRef(null)
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
      handleActions(response.actions ?? [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSending(false)
    }
  }

  const handleActions = (actions) => {
    actions.forEach((action) => {
      if (action.type === 'navigate_page') {
        onNavigate?.(action.page)
      } else if (action.type === 'open_record') {
        if (action.page === 'project-detail') onNavigate?.('project-detail', action.projectId)
        if (action.page === 'document-opener') onNavigate?.('document-opener', null, action.documentId)
      } else if (action.type === 'refresh_workspace_data') {
        onWorkspaceChanged()
      }
    })
  }

  const skillQuery = draft.startsWith('/') ? draft.slice(1).split(/\s/)[0].toLowerCase() : ''
  const matchingSkills = EVE_SKILLS.filter((skill) =>
    `${skill.command} ${skill.label}`.includes(skillQuery),
  )
  const selectSkill = (skill) => {
    setDraft(`/${skill.command} `)
    composerRef.current?.focus()
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
          <div className="eve-panel-heading">
            <div className="eve-avatar" aria-hidden="true"><Bot size={19} /></div>
            <div>
              <p id={descriptionId}>Your workspace copilot</p>
              <h2 id={titleId}>Eve AI assistant</h2>
              <span className="eve-status"><span className="eve-status-dot" />Workspace connected</span>
            </div>
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
          <section className="eve-context-card" aria-label="Eve workspace access">
            <div className="eve-context-icon"><ShieldCheck size={17} /></div>
            <div>
              <strong>Private workspace access</strong>
              <p>Eve can work with local StarWaves records. Connected integrations and secrets stay protected.</p>
            </div>
          </section>
          <div className="eve-conversation-label"><span>Conversation</span><span className="eve-conversation-rule" /></div>
          <div className="eve-messages" aria-live="polite" aria-label="Eve conversation">
            {messages.map((message, index) => <p className={`eve-message ${message.role}`} key={`${message.role}-${index}`}>{message.content}</p>)}
            {isSending && <p className="eve-message assistant">Eve is working...</p>}
          </div>
          {error && <p className="eve-error" role="alert">{error}</p>}
        </div>

        <form className="eve-composer" onSubmit={handleSubmit}>
          <div className="eve-composer-field">
            <label className="sr-only" htmlFor="eve-message">Message Eve</label>
            {draft.startsWith('/') && matchingSkills.length > 0 && (
              <div className="eve-skills-menu" role="listbox" aria-label="Eve skills">
                <div className="eve-skills-heading">Skills <span>Use / to browse</span></div>
                {matchingSkills.map((skill) => (
                  <button className="eve-skill-option" type="button" role="option" key={skill.command} onClick={() => selectSkill(skill)}>
                    <span className="eve-skill-command">/{skill.command}</span>
                    <span><strong>{skill.label}</strong><small>{skill.description}</small></span>
                  </button>
                ))}
              </div>
            )}
            <textarea ref={composerRef} id="eve-message" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} placeholder="Ask Eve anything about your workspace…" rows="3" maxLength="4000" disabled={isSending} />
            <span className="eve-composer-hint">Press Enter to send · Shift + Enter for a new line</span>
          </div>
          <button className="primary-button eve-send-button" type="submit" disabled={!draft.trim() || isSending} aria-label="Send message"><Send size={16} /></button>
        </form>
      </aside>
    </div>,
    document.body,
  )
}
