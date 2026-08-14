import { useState } from 'react'
import { Brain, Plus, Search, Trash2 } from 'lucide-react'

export function EveMemorySection({
  memories,
  isLoading,
  onAddMemory,
  onRemoveMemory,
  memoryDraft,
  setMemoryDraft,
  isAddingMemory,
  isSending,
}) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMemories = memories.filter((memory) => {
    if (!searchQuery.trim()) return true
    return (memory.content || '').toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <section className="eve-subpage-section" aria-label="Eve Memory">
      <div className="eve-subpage-header">
        <div>
          <h2>Eve Memory</h2>
          <p>
            Facts, preferences, and workspace rules Eve remembers about you across chat sessions and voice calls.
          </p>
        </div>
      </div>

      <div className="eve-memory-composer-card">
        <h3>
          <Brain size={16} />
          <span>Teach Eve a Fact or Instruction</span>
        </h3>
        <p>
          Eve references these facts to personalize responses, recall project context, and adapt to your preferences.
        </p>

        <form className="eve-memory-create-form" onSubmit={onAddMemory}>
          <textarea
            value={memoryDraft}
            onChange={(e) => setMemoryDraft(e.target.value)}
            placeholder="e.g. I prefer concise technical summaries. My primary tech stack is React and Python FastAPI."
            rows={2}
            maxLength={500}
            aria-label="New memory fact"
            required
          />
          <div className="eve-memory-form-footer">
            <span className="eve-char-counter">{memoryDraft.length} / 500 characters</span>
            <button
              type="submit"
              className="primary-button"
              disabled={!memoryDraft.trim() || isAddingMemory}
            >
              <Plus size={14} />
              <span>{isAddingMemory ? 'Remembering…' : 'Remember Fact'}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="eve-sessions-toolbar">
        <div className="eve-search-field">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search remembered facts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="eve-sessions-count">
          {filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'}
        </span>
      </div>

      {isLoading ? (
        <div className="eve-subpage-empty">
          <p>Loading remembered facts…</p>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="eve-subpage-empty">
          <Brain size={32} />
          <h3>{searchQuery ? 'No matching memories' : 'No memories saved yet'}</h3>
          <p>
            {searchQuery
              ? 'Try searching with different terms.'
              : 'Add a fact above, or simply tell Eve to “remember that…” during chat.'}
          </p>
        </div>
      ) : (
        <div className="eve-memory-grid" role="list">
          {filteredMemories.map((memory) => (
            <div key={memory.id} className="eve-memory-card">
              <div className="eve-memory-card-header">
                <span className="eve-memory-tag">Fact</span>
                <button
                  type="button"
                  className="eve-card-delete-btn"
                  onClick={() => onRemoveMemory(memory.id)}
                  disabled={isSending}
                  aria-label="Delete this memory"
                  title="Delete memory"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="eve-memory-card-text">{memory.content}</p>
              {memory.created_at && (
                <time className="eve-memory-card-time">
                  Saved {new Date(memory.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </time>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
