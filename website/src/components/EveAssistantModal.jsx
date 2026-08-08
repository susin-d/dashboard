import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, Maximize2, Send, ShieldCheck, X } from 'lucide-react'
import { sendEveMessage } from '../lib/eveApi'

const STARTER_MESSAGES = [{
  role: 'assistant',
  content: 'Hi, I\u2019m Eve. I can read, create, and update your workspace records. Use the Delete button when you need to remove something.',
}]

const EVE_SKILLS = [
  { command: 'today', label: 'Plan my day', description: 'Review tasks, deadlines, and calendar events' },
  { command: 'tasks', label: 'Manage tasks', description: 'Create, update, or find workspace todos' },
  { command: 'projects', label: 'Work with projects', description: 'Review project progress and next steps' },
  { command: 'jobs', label: 'Track applications', description: 'Find or update job application records' },
  { command: 'documents', label: 'Search documents', description: 'Find workspace documents and notes' },
  { command: 'calendar', label: 'Check calendar', description: 'Look up events, contests, and deadlines' },
]

const MAX_CHARS = 4000

export function EveAssistantModal({ isOpen, onClose, onNavigate, onWorkspaceChanged }) {
  const [messages, setMessages] = useState(STARTER_MESSAGES)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const panelRef = useRef(null)
  const composerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  /* Auto-scroll when messages change or typing indicator shows */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  /* Focus management, body lock, and Escape key */
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

  const hasUserMessages = messages.some((msg) => msg.role === 'user')
  const charProgress = draft.length / MAX_CHARS

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
        {/* ── Header ── */}
        <header className="eve-panel-header">
          <div className="eve-panel-heading">
            <div className="eve-avatar" aria-hidden="true"><Bot size={22} /></div>
            <div>
              <h2 id={titleId}>Eve</h2>
              <p id={descriptionId}>AI workspace copilot</p>
            </div>
          </div>
          <div className="eve-panel-controls">
            <span className="eve-status"><span className="eve-status-dot" />Connected</span>
            <button className="icon-button" type="button" onClick={() => setIsWide((wide) => !wide)} aria-label={isWide ? 'Reduce Eve assistant width' : 'Expand Eve assistant'}>
              <Maximize2 size={16} />
            </button>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close Eve assistant" data-eve-initial-focus>
              <X size={16} />
            </button>
          </div>
        </header>

        {/* ── Context Banner ── */}
        <div className="eve-context-banner" aria-label="Eve workspace access">
          <ShieldCheck size={14} />
          <span>Private workspace access \u2014 your integrations and secrets stay protected.</span>
        </div>

        {/* ── Conversation Body ── */}
        <div className="eve-panel-body">
          <div className="eve-messages" aria-live="polite" aria-label="Eve conversation">
            {messages.map((message, index) => (
              <div className={`eve-message ${message.role}`} key={`${message.role}-${index}`}>
                <p>{message.content}</p>
              </div>
            ))}
            {isSending && (
              <div className="eve-message assistant">
                <p>
                  <span className="eve-typing-dots" aria-label="Eve is thinking">
                    <span /><span /><span />
                  </span>
                </p>
              </div>
            )}
            {error && <p className="eve-error" role="alert">{error}</p>}
            {!hasUserMessages && (
              <div className="eve-suggestion-chips">
                {EVE_SKILLS.map((skill) => (
                  <button className="eve-chip" type="button" key={skill.command} onClick={() => selectSkill(skill)}>
                    {skill.label}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        </div>

        {/* ── Composer ── */}
        <form className="eve-composer" onSubmit={handleSubmit}>
          <div className="eve-composer-field">
            <label className="eve-composer-label" htmlFor="eve-message">Message Eve</label>
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
            <textarea
              ref={composerRef}
              id="eve-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder="Ask anything about your workspace\u2026"
              rows="2"
              maxLength={MAX_CHARS}
              disabled={isSending}
            />
            <div className="eve-composer-footer">
              <span className="eve-composer-hint">\u23CE to send</span>
              <button className="eve-send-button" type="submit" disabled={!draft.trim() || isSending} aria-label="Send message">
                <Send size={15} />
              </button>
            </div>
            <div className="eve-char-bar" style={{ '--char-progress': charProgress }} />
          </div>
        </form>
      </aside>
    </div>,
    document.body,
  )
}
