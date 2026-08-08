import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  Send,
  RotateCcw,
  Info,
} from 'lucide-react'
import { sendEveMessage } from '../lib/eveApi'

const STARTER_MESSAGES = [
  {
    role: 'assistant',
    content:
      'Hello! I’m Eve, your StarWaves AI workspace copilot. I can read, create, update, soft-delete, and restore records across your workspace including tasks, projects, jobs, hackathons, and documents.',
  },
]

const EVE_PRESET_PROMPTS = [
  { command: 'today', label: 'Plan my day', prompt: 'Plan my day by reviewing tasks, upcoming deadlines, and calendar events.', description: 'Review tasks, deadlines, and calendar events' },
  { command: 'tasks', label: 'Manage tasks & overdue', prompt: 'Find all overdue tasks and suggest next priority actions.', description: 'Audit overdue tasks and list priority items' },
  { command: 'projects', label: 'Work with projects', prompt: 'Review project progress, stale projects, and next steps.', description: 'Review project progress and stale projects' },
  { command: 'jobs', label: 'Track applications', prompt: 'Summarize recent job application statuses and upcoming interview dates.', description: 'Find job application status and interview dates' },
  { command: 'documents', label: 'Search documents', prompt: 'Search workspace documents and summarize key notes.', description: 'Search documents and notes' },
  { command: 'calendar', label: 'Check calendar & contests', prompt: 'Look up upcoming calendar events, competitive coding contests, and deadlines.', description: 'Look up events, contests, and deadlines' },
  { command: 'insights', label: 'Workspace overview', prompt: 'Summarize overall workspace dashboard metrics and suggest next actions.', description: 'Generate overall workspace insights' },
]

const EVE_TOOLS_LIST = [
  { command: 'todos', name: 'todos', label: 'Tasks & Todos Tool', description: 'Read, create, update, or soft-delete task items' },
  { command: 'projects', name: 'projects', label: 'Projects Tool', description: 'Access project repositories, milestones, and status' },
  { command: 'jobs', name: 'jobs', label: 'Job Tracker Tool', description: 'Access job applications, interview dates, and contacts' },
  { command: 'hackathons', name: 'hackathons', label: 'Hackathons Tool', description: 'Access hackathons, schedules, and prize details' },
  { command: 'documents', name: 'documents', label: 'Documents Tool', description: 'Access notes, project plans, and drive specs' },
  { command: 'notifications', name: 'notifications', label: 'Notifications Tool', description: 'Access workspace notifications and reminders' },
  { command: 'search', name: 'search', label: 'Workspace Search Tool', description: 'Search across all local workspace resources' },
  { command: 'insight', name: 'insight', label: 'Workspace Insights Tool', description: 'Compute deadlines, overdue tasks, or dashboard summary' },
]

const MAX_CHARS = 4000

export function EvePage({ onNavigate, onWorkspaceChanged }) {
  const [messages, setMessages] = useState(STARTER_MESSAGES)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  const messagesEndRef = useRef(null)
  const composerRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  const handleActions = (actions) => {
    if (!actions || !Array.isArray(actions)) return
    actions.forEach((action) => {
      if (action.type === 'navigate_page') {
        onNavigate?.(action.page)
      } else if (action.type === 'open_record') {
        if (action.page === 'project-detail') onNavigate?.('project-detail', action.projectId)
        if (action.page === 'document-opener') onNavigate?.('document-opener', null, action.documentId)
      } else if (action.type === 'refresh_workspace_data') {
        onWorkspaceChanged?.()
      }
    })
  }

  const sendMessage = async (customContent) => {
    const content = (customContent ?? draft).trim()
    if (!content || isSending) return

    const nextMessages = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setDraft('')
    setError('')
    setIsSending(true)

    try {
      const response = await sendEveMessage(nextMessages)
      setMessages((current) => [...current, { role: 'assistant', content: response.message }])
      if (response.changed_resources?.length) {
        onWorkspaceChanged?.()
      }
      handleActions(response.actions)
    } catch (requestError) {
      setError(requestError.message || 'Failed to send message to Eve.')
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage()
  }

  const handleReset = () => {
    setMessages(STARTER_MESSAGES)
    setError('')
  }

  const toolQuery = draft.startsWith('@') ? draft.slice(1).split(/\s/)[0].toLowerCase() : ''
  const matchingTools = EVE_TOOLS_LIST.filter((tool) =>
    `${tool.command} ${tool.label} ${tool.name}`.toLowerCase().includes(toolQuery),
  )

  const promptQuery = draft.startsWith('/') ? draft.slice(1).split(/\s/)[0].toLowerCase() : ''
  const matchingPrompts = EVE_PRESET_PROMPTS.filter((item) =>
    `${item.command} ${item.label}`.toLowerCase().includes(promptQuery),
  )

  const selectTool = (tool) => {
    setDraft(`@${tool.command} `)
    composerRef.current?.focus()
  }

  const selectPrompt = (item) => {
    setDraft(item.prompt)
    composerRef.current?.focus()
  }

  const charProgress = draft.length / MAX_CHARS

  return (
    <div className="eve-page-container">
      {/* ── Main Content Grid ── */}
        <main className="eve-chat-section">
            <div className="eve-banner-privacy">
              <button
                type="button"
                className="eve-reset-btn"
                onClick={handleReset}
                title="Reset conversation history"
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            </div>

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
                    <p className="eve-bubble-text">{msg.content}</p>
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

              <div ref={messagesEndRef} />
            </div>

            {/* Composer Form */}
            <form className="eve-page-composer" onSubmit={handleSubmit}>
              <div className="eve-composer-inner">
                {draft.startsWith('@') && matchingTools.length > 0 && (
                  <div className="eve-skills-popup" role="listbox" aria-label="Eve tools">
                    <div className="eve-skills-popup-title">
                      Workspace Tools & Resources <span>Type @ to reference</span>
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
                  disabled={isSending}
                />

                <div className="eve-composer-bar">
                  <span className="eve-char-counter">
                    {draft.length} / {MAX_CHARS}
                  </span>
                  <button
                    type="submit"
                    className="eve-send-btn"
                    disabled={!draft.trim() || isSending}
                    aria-label="Send message to Eve"
                  >
                    <Send size={15} />
                    <span>Send</span>
                  </button>
                </div>
                <div
                  className="eve-progress-indicator"
                  style={{ width: `${charProgress * 100}%` }}
                />
              </div>
            </form>
          </main>
    </div>
  )
}
