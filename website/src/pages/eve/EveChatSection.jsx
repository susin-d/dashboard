import { EveComposer } from './EveComposer'
import { EveMessageFeed } from './EveMessageFeed'

export function EveChatSection({
  messages,
  draft,
  setDraft,
  isSending,
  streamText = '',
  thinkingText = '',
  toolCalls = [],
  activeTool = null,
  onStop,
  error,
  promptQueue,
  addToQueue,
  removeFromQueue,
  handleSubmit,
  aiProviders = [],
  activeModel,
  onSelectAiModel,
}) {
  return (
    <main className="eve-chat-section">
      <EveMessageFeed
        messages={messages}
        isSending={isSending}
        streamText={streamText}
        thinkingText={thinkingText}
        toolCalls={toolCalls}
        activeTool={activeTool}
        error={error}
      />
      <EveComposer
        draft={draft}
        setDraft={setDraft}
        isSending={isSending}
        onStop={onStop}
        promptQueue={promptQueue}
        addToQueue={addToQueue}
        removeFromQueue={removeFromQueue}
        handleSubmit={handleSubmit}
        aiProviders={aiProviders}
        activeModel={activeModel}
        onSelectAiModel={onSelectAiModel}
      />
    </main>
  )
}
