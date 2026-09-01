import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Maximize2, Minimize2, Settings2, X } from 'lucide-react'
import { AVATAR_LIMITS } from './avatarConstants'
import { EveAvatar } from './EveAvatar'

export function EveGlobalCompanion({
  prefs,
  activeModel,
  presetId,
  isSending,
  isEveSpeaking,
  isEveThinking,
  thinkingText,
  activeTool,
  streamText,
  sttStatus,
  sttRecording,
  error,
  audioRef,
  onPrefsChange,
  onOpenSettings,
  onToggleRenderer,
}) {
  const [expanded, setExpanded] = useState(() => prefs?.docked !== false)
  const [dragging, setDragging] = useState(false)
  const rootRef = useRef(null)
  const pos = prefs?.position || { x: 92, y: 88 }
  const enabled = prefs?.enabled !== false
  const inlineVisibleRef = useRef(false)

  // Auto-minimize when inline avatar in viewport
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting)
      inlineVisibleRef.current = visible
      if (visible && expanded) setExpanded(false)
    }, { threshold: 0.2 })
    const candidates = document.querySelectorAll('[data-eve-target="eve-avatar"]')
    candidates.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [expanded])

  const handlePointerDown = useCallback((event) => {
    if (event.target.closest('button')) return
    const startX = event.clientX
    const startY = event.clientY
    const startPos = { ...pos }
    setDragging(true)
    const onMove = (moveEvent) => {
      const dx = ((moveEvent.clientX - startX) / window.innerWidth) * 100
      const dy = ((moveEvent.clientY - startY) / window.innerHeight) * 100
      const next = {
        x: Math.min(AVATAR_LIMITS.POSITION_MAX, Math.max(AVATAR_LIMITS.POSITION_MIN, startPos.x + dx)),
        y: Math.min(AVATAR_LIMITS.POSITION_MAX, Math.max(AVATAR_LIMITS.POSITION_MIN, startPos.y + dy)),
      }
      onPrefsChange?.({ position: next })
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [onPrefsChange, pos.x, pos.y])

  const isLanding = typeof window !== 'undefined' && (window.location.pathname === '/' || window.location.pathname === '/login' || window.location.pathname === '/signup')
  if (!enabled || isLanding) return null

  const style = {
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    transform: 'translate(-50%, -50%)',
  }

  return (
    <div
      ref={rootRef}
      className={`eve-global-companion ${expanded ? 'is-expanded' : 'is-docked'} ${dragging ? 'is-dragging' : ''}`}
      style={style}
      data-eve-target="eve-global-companion"
      role="complementary"
      aria-label="Eve global companion"
    >
      <div className="eve-global-header" onPointerDown={handlePointerDown} role="toolbar" aria-label="Eve companion controls">
        <div className="eve-global-drag-handle" aria-hidden="true"><Bot size={14} /></div>
        <span className="eve-global-title">Eve</span>
        <div className="eve-global-actions">
          <button type="button" className="eve-global-icon-btn" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? 'Minimize companion' : 'Expand companion'} title={expanded ? 'Minimize' : 'Expand'}>
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button type="button" className="eve-global-icon-btn" onClick={onOpenSettings} aria-label="Open avatar settings" title="Avatar settings"><Settings2 size={14} /></button>
          <button type="button" className="eve-global-icon-btn" onClick={() => onPrefsChange?.({ enabled: false })} aria-label="Hide companion" title="Hide"><X size={14} /></button>
        </div>
      </div>

      <div className="eve-global-body">
        {expanded ? (
          <EveAvatar
            size="md"
            presetId={presetId}
            prefs={prefs}
            activeModel={activeModel}
            isSending={isSending}
            isEveSpeaking={isEveSpeaking}
            isEveThinking={isEveThinking}
            thinkingText={thinkingText}
            activeTool={activeTool}
            streamText={streamText}
            sttStatus={sttStatus}
            sttRecording={sttRecording}
            error={error}
            audioRef={audioRef}
            onToggleRenderer={onToggleRenderer}
          />
        ) : (
          <button type="button" className="eve-global-docked-btn" onClick={() => setExpanded(true)} aria-label="Expand Eve companion">
            <span className="eve-global-docked-orb" aria-hidden="true" />
            <span className="eve-global-docked-label">Eve</span>
          </button>
        )}
      </div>
    </div>
  )
}
