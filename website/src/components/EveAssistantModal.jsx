import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, Maximize2, MoreVertical, Send, Trash2, X } from 'lucide-react'
import { deleteEveRecord, sendEveMessage } from '../lib/eveApi'

const STARTER_MESSAGES = [{
  role: 'assistant',
  content: 'Hi, I’m Eve. I can read, create, and update your workspace records. Use the Delete button when you need to remove something.',
}]

const DELETE_RESOURCES = [
  { value: 'todos', label: 'Todo' },
  { value: 'projects', label: 'Project' },
  { value: 'jobs', label: 'Job' },
  { value: 'hackathons', label: 'Hackathon' },
  { value: 'documents', label: 'Document' },
  { value: 'notifications', label: 'Notification' },
]

export function EveAssistantModal({ isOpen, onClose, onNavigate, onWorkspaceChanged }) {
  const [messages, setMessages] = useState(STARTER_MESSAGES)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteResource, setDeleteResource] = useState('todos')
  const [deleteRecordId, setDeleteRecordId] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
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

  const handleDelete = async (event) => {
    event.preventDefault()
    const recordId = deleteRecordId.trim()
    if (!recordId || isDeleting) return
    setError('')
    setIsDeleting(true)
    try {
      const response = await deleteEveRecord(deleteResource, recordId)
      setMessages((current) => [...current, { role: 'assistant', content: response.message }])
      setDeleteRecordId('')
      setDeleteOpen(false)
      if (response.changed_resources.length) onWorkspaceChanged()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsDeleting(false)
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
          <div className="eve-intro"><Bot size={18} aria-hidden="true" /><span>Eve can work with local StarWaves workspace records. Connected integrations and secrets stay protected.</span></div>
          <button className="eve-delete-toggle" type="button" onClick={() => setDeleteOpen((open) => !open)} aria-expanded={deleteOpen}>
            <Trash2 size={15} /> Delete record
          </button>
          {deleteOpen && (
            <form className="eve-delete-form" onSubmit={handleDelete}>
              <label>
                Type
                <select value={deleteResource} onChange={(event) => setDeleteResource(event.target.value)} disabled={isDeleting}>
                  {DELETE_RESOURCES.map((resource) => (
                    <option key={resource.value} value={resource.value}>{resource.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Record ID
                <input value={deleteRecordId} onChange={(event) => setDeleteRecordId(event.target.value)} placeholder="Paste the record id" disabled={isDeleting} />
              </label>
              <button className="primary-button" type="submit" disabled={!deleteRecordId.trim() || isDeleting}>
                <Trash2 size={15} /> Delete
              </button>
            </form>
          )}
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
