import { useRef, useState } from 'react'
import {
  Clock,
  Edit3,
  GripVertical,
  ListPlus,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  Send,
  Square,
  X,
} from 'lucide-react'
import { ModelSelectorDropdown } from '../../components/ui/ModelSelectorDropdown'
import { formatFileSize } from '../../utils/fileSize'
import { useEveAttachments } from './useEveAttachments'
import { useEveDictation } from './useEveDictation'

const MAX_CHARS = 4000

export function EveComposer({
  draft,
  setDraft,
  isSending,
  onStop,
  promptQueue,
  addToQueue,
  removeFromQueue,
  handleSubmit,
  aiProviders = [],
  activeModel,
  onSelectAiModel,
}) {
  const composerRef = useRef(null)
  const fileInputRef = useRef(null)
  const [queueCollapsed, setQueueCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const { attachments, processFiles, removeAttachment, clearAttachments } = useEveAttachments({ composerRef })
  const { isRecording, toggleVoiceRecording } = useEveDictation({ setDraft })

  const handleEditQueueItem = (index) => {
    const item = promptQueue[index]
    if (item) {
      setDraft(item)
      removeFromQueue(index)
      composerRef.current?.focus()
    }
  }

  const handleRunSingleQueueItem = (index) => {
    const item = promptQueue[index]
    if (item) {
      removeFromQueue(index)
      setDraft(item)
      setTimeout(() => {
        const form = composerRef.current?.form
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
        }
      }, 0)
    }
  }

  const onFormSubmit = (e) => {
    e?.preventDefault()
    if (!draft.trim() && attachments.length === 0) return
    handleSubmit(e, attachments)
    clearAttachments()
  }

  return (
    <div className="eve-composer-container">
      {promptQueue.length > 0 && (
        <div className="eve-queued-panel" aria-label="Queued Messages">
          <div className="eve-queued-header">
            <div className="eve-queued-header-left">
              <span className="eve-queued-title">Queued messages {promptQueue.length}</span>
            </div>
            <div className="eve-queued-header-right">
              <span className="eve-queued-hint">Sends after agent finishes</span>
              <button
                type="button"
                className="eve-queue-collapse-btn"
                onClick={() => setQueueCollapsed((c) => !c)}
                aria-label={queueCollapsed ? 'Expand queued messages' : 'Collapse queued messages'}
              >
                <Clock size={14} />
              </button>
            </div>
          </div>

          {!queueCollapsed && (
            <div className="eve-queued-list">
              {promptQueue.map((queuedPrompt, index) => (
                <div className="eve-queued-item-row" key={`${queuedPrompt}-${index}`}>
                  <div className="eve-queued-item-preview">
                    <GripVertical size={14} className="eve-queued-grip" />
                    <span className="eve-queued-item-text">{queuedPrompt}</span>
                  </div>
                  <div className="eve-queued-item-actions">
                    <button
                      type="button"
                      className="eve-queue-pill-btn"
                      onClick={() => handleEditQueueItem(index)}
                      title="Edit prompt"
                    >
                      <Edit3 size={12} />
                      <span>edit</span>
                    </button>
                    <button
                      type="button"
                      className="eve-queue-pill-btn primary"
                      onClick={() => handleRunSingleQueueItem(index)}
                      disabled={isSending}
                      title="Send now"
                    >
                      <Send size={12} />
                      <span>send</span>
                    </button>
                    <button
                      type="button"
                      className="eve-queued-action-btn delete"
                      onClick={() => removeFromQueue(index)}
                      title="Delete from queue"
                      aria-label="Delete from queue"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <form
        className="eve-page-composer"
        onSubmit={onFormSubmit}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragging(false)
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (e.dataTransfer.files?.length) {
            processFiles(e.dataTransfer.files)
          }
        }}
      >
        <div className={`eve-composer-card ${isDragging ? 'dragging' : ''}`}>
          {attachments.length > 0 && (
            <div className="eve-composer-attachments-row" aria-label="Attached files">
              {attachments.map((file) => (
                <div key={file.id} className="eve-composer-attachment-chip">
                  {file.isImage && file.dataUrl ? (
                    <img src={file.dataUrl} alt={file.name} className="eve-attachment-thumb" />
                  ) : (
                    <Paperclip size={13} className="eve-attachment-icon" />
                  )}
                  <div className="eve-attachment-meta">
                    <span className="eve-attachment-name" title={file.name}>
                      {file.name}
                    </span>
                    <span className="eve-attachment-size">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="eve-attachment-remove-btn"
                    onClick={() => removeAttachment(file.id)}
                    title={`Remove ${file.name}`}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={composerRef}
            className="eve-composer-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onFormSubmit(e)
              }
            }}
            placeholder={
              attachments.length > 0
                ? 'Add a message about the attached files (or press Enter to send)…'
                : 'Message Eve…'
            }
            rows={4}
            maxLength={MAX_CHARS}
          />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files) {
                processFiles(e.target.files)
                e.target.value = ''
              }
            }}
          />

          <div className="eve-composer-bottom-bar eve-composer-bottom-bar--dark">
            <div className="eve-composer-bottom-left">
              <button
                type="button"
                className="eve-bottom-pill-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Add files or documents"
                aria-label="Add files"
              >
                <Plus size={14} />
              </button>

              <ModelSelectorDropdown
                direction="up"
                activeModel={activeModel}
                onSelectModel={onSelectAiModel}
                providers={aiProviders}
              />
            </div>

            <div className="eve-composer-bottom-right">
              <button
                type="button"
                className="eve-bottom-icon-btn"
                onClick={addToQueue}
                disabled={!draft.trim()}
                title="Add to queue"
                aria-label="Add to queue"
              >
                <ListPlus size={16} />
              </button>

              <button
                type="button"
                className={`eve-bottom-icon-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleVoiceRecording}
                title={isRecording ? 'Stop voice recording' : 'Dictate with voice'}
                aria-label={isRecording ? 'Stop voice recording' : 'Dictate with voice'}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              {isSending ? (
                <button
                  type="button"
                  className="eve-stop-btn eve-stop-btn--dark"
                  onClick={onStop}
                  title="Stop generating"
                  aria-label="Stop generating"
                >
                  <Square size={12} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="eve-bottom-send-btn"
                  disabled={!draft.trim() && attachments.length === 0}
                  aria-label="Send message to Eve"
                  title="Send"
                >
                  <Send size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
