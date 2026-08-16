import { useState, useCallback } from 'react'
import { Bot, Send, PanelRightClose, PanelRightOpen } from 'lucide-react'

export function WorkspaceEvePanel({ collapsed, onToggle }) {
  const [message, setMessage] = useState('')
  const [chatLog, setChatLog] = useState([])
  const [sending, setSending] = useState(false)

  const handleSend = useCallback(async () => {
    const text = message.trim()
    if (!text || sending) return
    setChatLog((log) => [...log, { role: 'user', content: text }])
    setMessage('')
    setSending(true)
    try {
      // Eve coding agent chat will be wired to the Eve API with workspace context
      setChatLog((log) => [
        ...log,
        { role: 'assistant', content: 'Eve coding agent integration coming soon. Use the main Eve chat for now.' },
      ])
    } finally {
      setSending(false)
    }
  }, [message, sending])

  if (collapsed) {
    return (
      <div className="workspace-eve-collapsed">
        <button
          className="workspace-eve-toggle"
          onClick={onToggle}
          title="Open Eve panel"
        >
          <PanelRightOpen size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="workspace-eve-panel">
      <div className="workspace-eve-header">
        <div className="workspace-eve-header-left">
          <Bot size={16} />
          <span>Eve Agent</span>
        </div>
        <button
          className="workspace-eve-toggle"
          onClick={onToggle}
          title="Close Eve panel"
        >
          <PanelRightClose size={16} />
        </button>
      </div>
      <div className="workspace-eve-chat">
        {chatLog.length === 0 ? (
          <div className="workspace-eve-empty">
            <Bot size={24} />
            <p>Ask Eve to help with your code</p>
          </div>
        ) : (
          chatLog.map((entry, index) => (
            <div key={index} className={`workspace-eve-message ${entry.role}`}>
              {entry.content}
            </div>
          ))
        )}
      </div>
      <div className="workspace-eve-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Ask Eve..."
          disabled={sending}
        />
        <button
          className="workspace-eve-send"
          onClick={handleSend}
          disabled={!message.trim() || sending}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
