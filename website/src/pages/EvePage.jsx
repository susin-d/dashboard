import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  Send,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Calendar,
  FolderKanban,
  CheckSquare,
  FileText,
  Briefcase,
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  Layers,
} from 'lucide-react'
import { sendEveMessage } from '../lib/eveApi'

const STARTER_MESSAGES = [
  {
    role: 'assistant',
    content:
      'Hello! I’m Eve, your StarWaves AI workspace copilot. I can read, create, update, soft-delete, and restore records across your workspace including tasks, projects, jobs, hackathons, and documents.',
  },
]

const EVE_PROMPT_TEMPLATES = [
  {
    icon: Calendar,
    title: 'Plan my day',
    prompt: 'Plan my day by reviewing tasks, upcoming deadlines, and calendar events.',
    description: 'Get a prioritized schedule for today',
  },
  {
    icon: CheckSquare,
    title: 'Audit overdue tasks',
    prompt: 'Find all overdue tasks and suggest next actions to complete or reschedule them.',
    description: 'Identify pending todos and roadblocks',
  },
  {
    icon: FolderKanban,
    title: 'Review project status',
    prompt: 'List active projects and highlight any that are stale or need attention.',
    description: 'Summarize active development projects',
  },
  {
    icon: Briefcase,
    title: 'Job application update',
    prompt: 'Summarize recent job application statuses and upcoming interview dates.',
    description: 'Track application progress',
  },
  {
    icon: FileText,
    title: 'Search documents',
    prompt: 'Search through workspace documents for notes or drafts that need updates.',
    description: 'Audit workspace notes and files',
  },
]

const EVE_SKILLS = [
  { command: 'today', label: 'Plan my day', description: 'Review tasks, deadlines, and calendar events' },
  { command: 'tasks', label: 'Manage tasks', description: 'Create, update, or find workspace todos' },
  { command: 'projects', label: 'Work with projects', description: 'Review project progress and next steps' },
  { command: 'jobs', label: 'Track applications', description: 'Find or update job application records' },
  { command: 'documents', label: 'Search documents', description: 'Find workspace documents and notes' },
  { command: 'calendar', label: 'Check calendar', description: 'Look up events, contests, and deadlines' },
]

const WORKSPACE_RESOURCES = [
  { name: 'Todos', desc: 'Create, update, toggle, soft-delete, or restore task items', icon: CheckSquare, route: 'todo' },
  { name: 'Projects', desc: 'Manage repositories, tech stacks, milestones, and links', icon: FolderKanban, route: 'projects' },
  { name: 'Job Applications', desc: 'Track companies, roles, interview dates, and notes', icon: Briefcase, route: 'jobs' },
  { name: 'Hackathons', desc: 'Track dates, prizes, teams, and submission links', icon: Layers, route: 'hackathons' },
  { name: 'Documents', desc: 'Read, write, edit, and organize notes and specs', icon: FileText, route: 'documents' },
]

const MAX_CHARS = 4000

export function EvePage({ onNavigate, onWorkspaceChanged }) {
  const [messages, setMessages] = useState(STARTER_MESSAGES)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'capabilities'

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

  const skillQuery = draft.startsWith('/') ? draft.slice(1).split(/\s/)[0].toLowerCase() : ''
  const matchingSkills = EVE_SKILLS.filter((skill) =>
    `${skill.command} ${skill.label}`.includes(skillQuery),
  )

  const selectSkill = (skill) => {
    setDraft(`/${skill.command} `)
    composerRef.current?.focus()
  }

  const charProgress = draft.length / MAX_CHARS

  return (
    <div className="eve-page-container">
      {/* ── Header Bar ── */}
      <header className="eve-header-card">
        <div className="eve-header-main">
          <div className="eve-avatar-large">
            <Bot size={28} />
          </div>
          <div className="eve-header-details">
            <div className="eve-title-row">
              <h1>Eve AI Copilot</h1>
              <span className="eve-badge">
                <span className="eve-pulse-dot" /> Connected
              </span>
            </div>
            <p className="eve-subtitle">
              Your autonomous StarWaves assistant for tasks, projects, documents, calendar & application management.
            </p>
          </div>
        </div>
        <div className="eve-header-actions">
          <button
            type="button"
            className={`eve-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat Stream
          </button>
          <button
            type="button"
            className={`eve-tab-btn ${activeTab === 'capabilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('capabilities')}
          >
            Capabilities & Safety
          </button>
          <button
            type="button"
            className="eve-reset-btn"
            onClick={handleReset}
            title="Reset conversation history"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* ── Main Content Grid ── */}
      <div className="eve-content-grid">
        {/* Left / Primary Column: Chat Stream */}
        {activeTab === 'chat' && (
          <main className="eve-chat-section">
            <div className="eve-banner-privacy">
              <ShieldCheck size={16} />
              <span>
                Private workspace scope — Eve operates strictly on your signed-in account data with 7-day soft-delete recovery protection.
              </span>
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

            {/* Quick Prompt Cards inside Chat (if short history) */}
            {messages.length <= 2 && (
              <div className="eve-starter-prompts">
                <span className="eve-section-label">
                  <Sparkles size={14} /> Quick Start Prompts
                </span>
                <div className="eve-prompts-grid">
                  {EVE_PROMPT_TEMPLATES.map((item, idx) => {
                    const IconComponent = item.icon
                    return (
                      <button
                        key={idx}
                        type="button"
                        className="eve-prompt-card"
                        onClick={() => sendMessage(item.prompt)}
                        disabled={isSending}
                      >
                        <div className="eve-prompt-card-header">
                          <IconComponent size={16} />
                          <strong>{item.title}</strong>
                        </div>
                        <p>{item.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Composer Form */}
            <form className="eve-page-composer" onSubmit={handleSubmit}>
              <div className="eve-composer-inner">
                {draft.startsWith('/') && matchingSkills.length > 0 && (
                  <div className="eve-skills-popup" role="listbox">
                    <div className="eve-skills-popup-title">
                      Available Commands <span>Type / to filter</span>
                    </div>
                    {matchingSkills.map((skill) => (
                      <button
                        type="button"
                        key={skill.command}
                        className="eve-skill-item"
                        onClick={() => selectSkill(skill)}
                      >
                        <span className="eve-skill-cmd">/{skill.command}</span>
                        <div className="eve-skill-desc">
                          <strong>{skill.label}</strong>
                          <small>{skill.description}</small>
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
                  placeholder="Ask Eve to plan your day, search notes, update projects, or audit tasks… (Press Enter to send)"
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
        )}

        {/* Capabilities Tab Content (when active) */}
        {activeTab === 'capabilities' && (
          <main className="eve-capabilities-section">
            <h2>Eve Capabilities & Integration Overview</h2>
            <p className="eve-cap-intro">
              Eve connects directly to your StarWaves Firestore workspace. It executes tool calls with strict permission controls, ensuring your integrations and tokens remain secure.
            </p>

            <div className="eve-cap-cards-grid">
              {WORKSPACE_RESOURCES.map((res, i) => {
                const IconComp = res.icon
                return (
                  <div key={i} className="eve-cap-card">
                    <div className="eve-cap-card-header">
                      <div className="eve-cap-icon">
                        <IconComp size={20} />
                      </div>
                      <div>
                        <h3>{res.name}</h3>
                        <span className="eve-cap-badge">Read, Create, Update, Delete</span>
                      </div>
                    </div>
                    <p>{res.desc}</p>
                    <button
                      type="button"
                      className="eve-cap-nav-link"
                      onClick={() => onNavigate?.(res.route)}
                    >
                      Open {res.name} page <ChevronRight size={14} />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="eve-safety-box">
              <Clock size={20} />
              <div>
                <h3>7-Day Recovery Guarantee</h3>
                <p>
                  When Eve soft-deletes a task, project, job, hackathon, or document, the record enters a 7-day recovery stage. You can ask Eve at any time to restore deleted records before permanent purge.
                </p>
              </div>
            </div>
          </main>
        )}

        {/* Right / Secondary Sidebar Column */}
        <aside className="eve-sidebar-section">
          {/* Quick Prompts Box */}
          <div className="eve-sidebar-card">
            <h3>
              <Sparkles size={16} /> Quick Action Prompts
            </h3>
            <p className="eve-sidebar-desc">Click any prompt to trigger Eve</p>
            <div className="eve-sidebar-prompts-list">
              {EVE_PROMPT_TEMPLATES.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="eve-sidebar-prompt-btn"
                  onClick={() => {
                    setActiveTab('chat')
                    sendMessage(item.prompt)
                  }}
                  disabled={isSending}
                >
                  <span>{item.title}</span>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </div>

          {/* Direct Workspace Navigation Shortcuts */}
          <div className="eve-sidebar-card">
            <h3>Workspace Shortcuts</h3>
            <div className="eve-shortcuts-list">
              <button
                type="button"
                className="eve-shortcut-btn"
                onClick={() => onNavigate?.('todo')}
              >
                <CheckSquare size={16} />
                <span>Todo List</span>
                <ExternalLink size={13} />
              </button>
              <button
                type="button"
                className="eve-shortcut-btn"
                onClick={() => onNavigate?.('projects')}
              >
                <FolderKanban size={16} />
                <span>Projects</span>
                <ExternalLink size={13} />
              </button>
              <button
                type="button"
                className="eve-shortcut-btn"
                onClick={() => onNavigate?.('documents')}
              >
                <FileText size={16} />
                <span>Documents</span>
                <ExternalLink size={13} />
              </button>
              <button
                type="button"
                className="eve-shortcut-btn"
                onClick={() => onNavigate?.('jobs')}
              >
                <Briefcase size={16} />
                <span>Jobs</span>
                <ExternalLink size={13} />
              </button>
              <button
                type="button"
                className="eve-shortcut-btn"
                onClick={() => onNavigate?.('calendar')}
              >
                <Calendar size={16} />
                <span>Calendar</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
