import { useState } from 'react'
import { Bot, Send } from 'lucide-react'
import { sendEveMessage } from '../lib/eveApi'
import { Modal } from './ui'

const STARTER_MESSAGES = [{
  role: 'assistant',
  content: 'Hi, I’m Eve. I can read, create, and update your tasks, projects, jobs, and documents.',
}]

export function EveAssistantModal({ isOpen, onClose, onWorkspaceChanged }) {
  const [messages, setMessages] = useState(STARTER_MESSAGES)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eve AI assistant" subtitle="Your workspace copilot" className="eve-assistant-modal">
      <div className="eve-intro"><Bot size={18} aria-hidden="true" /><span>Eve only works with the records in your StarWaves account.</span></div>
      <div className="eve-messages" aria-live="polite" aria-label="Eve conversation">
        {messages.map((message, index) => <p className={`eve-message ${message.role}`} key={`${message.role}-${index}`}>{message.content}</p>)}
        {isSending && <p className="eve-message assistant">Eve is working…</p>}
      </div>
      {error && <p className="eve-error" role="alert">{error}</p>}
      <form className="eve-composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="eve-message">Message Eve</label>
        <textarea id="eve-message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="For example: Add a task to review the API tomorrow" rows="3" maxLength="4000" disabled={isSending} />
        <button className="primary-button" type="submit" disabled={!draft.trim() || isSending}><Send size={15} />Send</button>
      </form>
    </Modal>
  )
}
