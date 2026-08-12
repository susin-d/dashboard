import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  ListPlus,
  MessageSquare,
  PhoneCall,
  PhoneIncoming,
  Plus,
  Play,
  Send,
  Info,
  Trash2,
  X,
} from 'lucide-react'
import {
  createEveMemory,
  createEveSession,
  deleteEveMemory,
  deleteEveSession,
  getEveSession,
  listEveMemories,
  listEveSessions,
  sendEveMessage,
} from '../lib/eveApi'
import { Markdown } from '../components/ui/Markdown'

const STARTER_MESSAGES = [
  {
    role: 'assistant',
    content:
      'Hello! I’m Eve, your StarWaves AI workspace copilot. I can read, create, update, soft-delete, and restore records across your workspace including tasks, projects, jobs, hackathons, and documents.',
  },
]

const EVE_PRESET_PROMPTS = [
  { command: 'call', label: 'Call me now', prompt: 'Call me right now on voice to review my workspace status.', description: 'Trigger an immediate incoming voice call from Eve' },
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

export function EvePage({ callCenter, onNavigate, onWorkspaceChanged, chatResetKey }) {
  const [messages, setMessages] = useState(STARTER_MESSAGES)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [promptQueue, setPromptQueue] = useState([])
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [memories, setMemories] = useState([])
  const [memoryDraft, setMemoryDraft] = useState('')
  const [isAddingMemory, setIsAddingMemory] = useState(false)
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(true)

  const messagesEndRef = useRef(null)
  const composerRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  const refreshSidebar = async () => {
    try {
      const [sessionData, memoryData] = await Promise.all([listEveSessions(), listEveMemories()])
      setSessions(sessionData.sessions ?? [])
      setMemories(memoryData.memories ?? [])
    } catch (sidebarError) {
      setError(sidebarError.message || 'Could not load Eve sessions and memory.')
    } finally {
      setIsLoadingSidebar(false)
    }
  }

  useEffect(() => {
    setMessages(STARTER_MESSAGES)
    setDraft('')
    setError('')
    setPromptQueue([])
    setActiveSessionId(null)
    refreshSidebar()
  }, [chatResetKey])

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
      } else if (action.type === 'trigger_eve_call') {
        callCenter?.requestEveCall?.('audio')
      }
    })
  }

  const sendMessage = async (customContent) => {
    const content = (customContent ?? draft).trim()
    if (!content || isSending) return

    try {
      await sendPrompt(content, messages)
    } catch (requestError) {
      setError(requestError.message || 'Failed to send message to Eve.')
    } finally {
      setIsSending(false)
    }
  }

  const sendPrompt = async (content, baseMessages) => {
    const nextMessages = [...baseMessages, { role: 'user', content }]
    setMessages(nextMessages)
    setDraft('')
    setError('')
    setIsSending(true)

    let sessionId = activeSessionId
    if (!sessionId) {
      const createdSession = await createEveSession(nextMessages)
      sessionId = createdSession.session.id
      setActiveSessionId(sessionId)
    }

    const response = await sendEveMessage(nextMessages, sessionId)
    const finalMessages = [...nextMessages, { role: 'assistant', content: response.message }]
    setMessages(finalMessages)
    if (response.changed_resources?.length) {
      onWorkspaceChanged?.()
    }
    handleActions(response.actions)
    refreshSidebar()
    return finalMessages
  }

  const startNewChat = () => {
    setMessages(STARTER_MESSAGES)
    setDraft('')
    setError('')
    setPromptQueue([])
    setActiveSessionId(null)
  }

  const resumeSession = async (session) => {
    try {
      const sessionData = await getEveSession(session.id)
      setMessages(sessionData.session.messages)
      setActiveSessionId(session.id)
      setError('')
    } catch (sessionError) {
      setError(sessionError.message || 'Could not load that Eve session.')
    }
  }

  const removeSession = async (sessionId) => {
    try {
      await deleteEveSession(sessionId)
      if (activeSessionId === sessionId) startNewChat()
      refreshSidebar()
    } catch (sessionError) {
      setError(sessionError.message || 'Could not delete that Eve session.')
    }
  }

  const addMemory = async (e) => {
    e.preventDefault()
    const content = memoryDraft.trim()
    if (!content || isAddingMemory) return
    setIsAddingMemory(true)
    setError('')
    try {
      const memoryData = await createEveMemory(content)
      setMemories(memoryData.memories ?? [])
      setMemoryDraft('')
    } catch (memoryError) {
      setError(memoryError.message || 'Could not save that memory.')
    } finally {
      setIsAddingMemory(false)
    }
  }

  const removeMemory = async (memoryId) => {
    try {
      await deleteEveMemory(memoryId)
      setMemories((current) => current.filter((memory) => memory.id !== memoryId))
    } catch (memoryError) {
      setError(memoryError.message || 'Could not delete that memory.')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage()
  }

  const addToQueue = () => {
    const content = draft.trim()
    if (!content || isSending) return
    setPromptQueue((current) => [...current, content])
    setDraft('')
    composerRef.current?.focus()
  }

  const removeFromQueue = (index) => {
    setPromptQueue((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const clearQueue = () => {
    setPromptQueue([])
  }

  const runQueue = async () => {
    if (isSending || !promptQueue.length) return
    const queuedPrompts = [...promptQueue]
    setPromptQueue([])
    setError('')
    setIsSending(true)
    let conversation = messages
    try {
      for (const prompt of queuedPrompts) {
        conversation = await sendPrompt(prompt, conversation)
      }
    } catch (requestError) {
      setError(requestError.message || 'Failed to send message to Eve.')
    } finally {
      setIsSending(false)
    }
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
      <div className="eve-header-banner">
        <div className="eve-header-info">
          <Bot size={18} />
          <div>
            <strong>Eve AI Voice Assistant</strong>
            <small>Have an interactive real-time voice call with Eve</small>
          </div>
        </div>
        <div className="eve-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => callCenter?.dial?.('eve@starwaves.app', 'audio')}
            title="Start voice call with Eve AI Assistant"
          >
            <PhoneCall size={14} />
            <span>Voice Call Eve</span>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => callCenter?.requestEveCall?.('audio')}
            title="Have Eve initiate an incoming call to you"
          >
            <PhoneIncoming size={14} />
            <span>Request Eve Call</span>
          </button>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="eve-content-grid">
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
                      disabled={!draft.trim() || isSending}
                      aria-label="Add message to queue"
                      title="Add to queue"
                    >
                      <ListPlus size={16} />
                    </button>
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
                          disabled={isSending}
                          aria-label="Remove queued message"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button className="eve-queue-clear" type="button" onClick={clearQueue} disabled={isSending}>
                    Clear queue
                  </button>
                </div>
              )}
            </form>
          </main>

        {/* ── Sidebar Column ── */}
        <aside className="eve-sidebar-section" aria-label="Eve sessions and memory">
          <div className="eve-sidebar-card">
            <h3>
              <MessageSquare size={15} />
              Sessions
            </h3>
            <p className="eve-sidebar-desc">
              Continue a past conversation or start a new one. Each conversation is saved automatically.
            </p>
            <button type="button" className="eve-new-session-btn" onClick={startNewChat} disabled={isSending}>
              <Plus size={14} />
              New chat
            </button>
            {isLoadingSidebar ? (
              <p className="eve-sidebar-desc">Loading sessions…</p>
            ) : sessions.length === 0 ? (
              <p className="eve-sidebar-desc">No sessions yet.</p>
            ) : (
              <div className="eve-session-list" role="list">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`eve-session-item${session.id === activeSessionId ? ' active' : ''}`}
                  >
                    <button
                      type="button"
                      className="eve-session-open"
                      onClick={() => resumeSession(session)}
                      disabled={isSending}
                      title={session.preview ?? session.title}
                    >
                      <span className="eve-session-title">{session.title}</span>
                      {session.preview && <span className="eve-session-preview">{session.preview}</span>}
                    </button>
                    <button
                      type="button"
                      className="eve-session-delete"
                      onClick={() => removeSession(session.id)}
                      disabled={isSending}
                      aria-label={`Delete session ${session.title}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="eve-sidebar-card">
            <h3>
              <Bot size={15} />
              Eve Memory
            </h3>
            <p className="eve-sidebar-desc">
              Facts Eve remembers about you and your workspace. You can also tell Eve to “remember” something.
            </p>
            <form className="eve-memory-form" onSubmit={addMemory}>
              <input
                type="text"
                value={memoryDraft}
                onChange={(e) => setMemoryDraft(e.target.value)}
                placeholder="Add a fact for Eve to remember…"
                maxLength={500}
                aria-label="New memory"
              />
              <button type="submit" className="eve-memory-add" disabled={!memoryDraft.trim() || isAddingMemory}>
                <Plus size={14} />
              </button>
            </form>
            {isLoadingSidebar ? (
              <p className="eve-sidebar-desc">Loading memory…</p>
            ) : memories.length === 0 ? (
              <p className="eve-sidebar-desc">Nothing remembered yet.</p>
            ) : (
              <div className="eve-memory-list" role="list">
                {memories.map((memory) => (
                  <div key={memory.id} className="eve-memory-item">
                    <span className="eve-memory-content">{memory.content}</span>
                    <button
                      type="button"
                      className="eve-memory-delete"
                      onClick={() => removeMemory(memory.id)}
                      disabled={isSending}
                      aria-label="Delete memory"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
