import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { Markdown } from '../../components/ui/Markdown'
import { createEveSession, sendEveMessage } from '../../lib/eveApi'
import { composeBriefText, takeStudioBrief } from './studioBrief'

const CHAT_SESSION_KEY_PREFIX = 'starwaves.studio.chat_session.'

function loadSessionId(projectId) {
  try {
    return localStorage.getItem(CHAT_SESSION_KEY_PREFIX + projectId)
  } catch {
    return null
  }
}

function storeSessionId(projectId, sessionId) {
  try {
    localStorage.setItem(CHAT_SESSION_KEY_PREFIX + projectId, sessionId)
  } catch {
    // localStorage unavailable — session simply won't persist.
  }
}

export function BuilderChat({ projectId, projectName, onActions }) {
  const starter = {
    role: 'assistant',
    content: `Hi! I'm Eve. Tell me what to build or change in **${projectName}** — I'll plan it first, and after you approve the plan in Studio, I'll write the code.`,
  }
  const [messages, setMessages] = useState(() => [starter])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const feedEndRef = useRef(null)

  useEffect(() => {
    setMessages([starter])
    const brief = takeStudioBrief(projectId)
    setDraft(brief ? composeBriefText(brief.prompt, brief.attachments) : '')
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  const handleSubmit = async (event) => {
    event?.preventDefault()
    const content = draft.trim()
    if (!content || isSending) return

    setDraft('')
    setError('')
    setIsSending(true)
    const nextMessages = [...messages, { role: 'user', content }]
    setMessages(nextMessages)

    try {
      let sessionId = loadSessionId(projectId)
      if (!sessionId) {
        const created = await createEveSession(nextMessages)
        sessionId = created.session.id
        storeSessionId(projectId, sessionId)
      }
      const apiMessages = nextMessages.map(({ role, content: text }) => ({ role, content: text }))
      const response = await sendEveMessage(apiMessages, sessionId)
      setMessages([...nextMessages, { role: 'assistant', content: response.message }])
      onActions?.(response.actions)
    } catch (sendError) {
      setError(sendError.message || 'Eve could not respond. Try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="builder-chat" aria-label="Eve builder chat">
      <div className="builder-chat-feed" role="log" aria-live="polite">
        {messages.map((message, index) => (
          <div key={index} className={`eve-chat-bubble ${message.role}`}>
            {message.role === 'assistant' ? (
              <div className="eve-bubble-text eve-bubble-markdown">
                <Markdown content={message.content} />
              </div>
            ) : (
              message.content && <p className="eve-bubble-text">{message.content}</p>
            )}
          </div>
        ))}
        {isSending && (
          <div className="eve-chat-bubble assistant sending">
            <div className="eve-typing-indicator" aria-label="Eve is thinking">
              <span /><span /><span />
            </div>
          </div>
        )}
        {error && <p className="studio-form-error" role="alert">{error}</p>}
        <div ref={feedEndRef} />
      </div>

      <form className="builder-chat-composer" onSubmit={handleSubmit}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder="Describe what to build or change…"
          rows={2}
          aria-label="Message to Eve"
        />
        <button
          type="submit"
          className="primary-button builder-chat-send"
          disabled={!draft.trim() || isSending}
          aria-label="Send message to Eve"
        >
          <Send size={15} />
        </button>
      </form>
    </section>
  )
}
