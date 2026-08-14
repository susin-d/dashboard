import { useEffect, useState } from 'react'
import {
  Bot,
  Brain,
  CalendarClock,
  MessageSquare,
  PhoneCall,
  PhoneIncoming,
  History,
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
import { loadAiModels, saveAiModelPreference } from '../lib/aiModelsApi'
import { EveChatSection } from './eve/EveChatSection'
import { EveSessionsSection } from './eve/EveSessionsSection'
import { EveMemorySection } from './eve/EveMemorySection'
import { EveSchedulesSection } from './eve/EveSchedulesSection'

const STARTER_MESSAGES = [
  {
    role: 'assistant',
    content:
      'Hello! I’m Eve, your StarWaves AI workspace assistant. I can read, create, update, soft-delete, and restore records across your workspace including tasks, projects, jobs, hackathons, and documents.',
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

export function EvePage({ callCenter, onNavigate, onWorkspaceChanged, chatResetKey }) {
  const [activeTab, setActiveTab] = useState('chat')
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
  const [aiProviders, setAiProviders] = useState([])
  const [activeModel, setActiveModel] = useState({ provider: 'openai', model: 'gpt-5-mini', label: 'GPT-5 mini' })

  const refreshSidebar = async () => {
    try {
      const [sessionData, memoryData, modelsData] = await Promise.all([
        listEveSessions().catch(() => ({ sessions: [] })),
        listEveMemories().catch(() => ({ memories: [] })),
        loadAiModels().catch(() => null),
      ])
      setSessions(sessionData.sessions ?? [])
      setMemories(memoryData.memories ?? [])

      if (modelsData?.providers) {
        const available = modelsData.providers.filter((p) => p.available)
        setAiProviders(available)
        const pref = modelsData.preference
        const selectedProv = available.find((p) => p.id === (pref?.provider || '')) || available[0]
        if (selectedProv) {
          const modelObj = selectedProv.models?.find((m) => m.id === (pref?.model || '')) || selectedProv.models?.[0]
          setActiveModel({
            provider: selectedProv.id,
            model: modelObj?.id || pref?.model || selectedProv.default_model || 'gpt-5-mini',
            label: modelObj?.label || modelObj?.id || 'GPT-5 mini',
          })
        }
      }
    } catch (sidebarError) {
      setError(sidebarError.message || 'Could not load Eve sessions and memory.')
    } finally {
      setIsLoadingSidebar(false)
    }
  }

  const handleSelectAiModel = async (providerId, modelId, modelLabel) => {
    setActiveModel({ provider: providerId, model: modelId, label: modelLabel })
    try {
      await saveAiModelPreference({ provider: providerId, model: modelId })
    } catch (err) {
      console.warn('Could not save model preference:', err)
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
      } else if (action.type === 'refresh_eve_schedules') {
        refreshSidebar()
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
    setActiveTab('chat')
  }

  const resumeSession = async (session) => {
    try {
      const sessionData = await getEveSession(session.id)
      setMessages(sessionData?.session?.messages || STARTER_MESSAGES)
      setActiveSessionId(session.id)
      setError('')
      setActiveTab('chat')
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
    e?.preventDefault()
    const content = draft.trim()
    if (!content) return
    if (isSending) {
      setPromptQueue((current) => [...current, content])
      setDraft('')
      return
    }
    sendMessage()
  }

  const addToQueue = () => {
    const content = draft.trim()
    if (!content) return
    setPromptQueue((current) => [...current, content])
    setDraft('')
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
  }

  const selectPrompt = (item) => {
    setDraft(item.prompt)
  }

  return (
    <div className="eve-page-container">
      {/* ── Voice & Quick Actions Banner ── */}
      <div className="eve-header-banner">
        <div className="eve-header-info">
          <Bot size={18} />
          <div>
            <strong>Eve AI Workspace Assistant</strong>
            <small>Interact via text chat, scheduled reminders, or real-time voice calls</small>
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

      {/* ── Eve App Layout with Mini-Sidebar ── */}
      <div className="eve-app-layout">
        <aside className="eve-mini-sidebar" aria-label="Eve Sub-navigation">
          <nav className="eve-nav-list" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'chat'}
              className={`eve-nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={16} />
              <div className="eve-nav-text">
                <span className="eve-nav-title">Chat &amp; Assistant</span>
                <span className="eve-nav-subtitle">Live workspace assistant</span>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'sessions'}
              className={`eve-nav-btn ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => setActiveTab('sessions')}
            >
              <History size={16} />
              <div className="eve-nav-text">
                <span className="eve-nav-title">Chat Sessions</span>
                <span className="eve-nav-subtitle">Past conversation history</span>
              </div>
              {sessions.length > 0 && (
                <span className="eve-nav-badge">{sessions.length}</span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'memory'}
              className={`eve-nav-btn ${activeTab === 'memory' ? 'active' : ''}`}
              onClick={() => setActiveTab('memory')}
            >
              <Brain size={16} />
              <div className="eve-nav-text">
                <span className="eve-nav-title">Eve Memory</span>
                <span className="eve-nav-subtitle">Remembered facts &amp; rules</span>
              </div>
              {memories.length > 0 && (
                <span className="eve-nav-badge">{memories.length}</span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'schedules'}
              className={`eve-nav-btn ${activeTab === 'schedules' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedules')}
            >
              <CalendarClock size={16} />
              <div className="eve-nav-text">
                <span className="eve-nav-title">Schedules &amp; Reminders</span>
                <span className="eve-nav-subtitle">Automated prompts &amp; calls</span>
              </div>
            </button>
          </nav>
        </aside>

        {/* ── Active Section View ── */}
        <div className="eve-active-view-container">
          {activeTab === 'chat' && (
            <EveChatSection
              messages={messages}
              draft={draft}
              setDraft={setDraft}
              isSending={isSending}
              error={error}
              promptQueue={promptQueue}
              addToQueue={addToQueue}
              removeFromQueue={removeFromQueue}
              clearQueue={clearQueue}
              runQueue={runQueue}
              handleSubmit={handleSubmit}
              matchingTools={matchingTools}
              matchingPrompts={matchingPrompts}
              selectTool={selectTool}
              selectPrompt={selectPrompt}
              EVE_PRESET_PROMPTS={EVE_PRESET_PROMPTS}
              aiProviders={aiProviders}
              activeModel={activeModel}
              onSelectAiModel={handleSelectAiModel}
            />
          )}

          {activeTab === 'sessions' && (
            <EveSessionsSection
              sessions={sessions}
              activeSessionId={activeSessionId}
              isLoading={isLoadingSidebar}
              onResumeSession={resumeSession}
              onRemoveSession={removeSession}
              onStartNewChat={startNewChat}
              isSending={isSending}
            />
          )}

          {activeTab === 'memory' && (
            <EveMemorySection
              memories={memories}
              isLoading={isLoadingSidebar}
              onAddMemory={addMemory}
              onRemoveMemory={removeMemory}
              memoryDraft={memoryDraft}
              setMemoryDraft={setMemoryDraft}
              isAddingMemory={isAddingMemory}
              isSending={isSending}
            />
          )}

          {activeTab === 'schedules' && (
            <EveSchedulesSection onScheduleTriggered={refreshSidebar} />
          )}
        </div>
      </div>
    </div>
  )
}
