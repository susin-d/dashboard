import { useMemo, useRef } from 'react'
import { AVATAR_DEFAULTS } from './avatarConstants'
import { EveAvatarCanvas } from './EveAvatarCanvas'
import { Live2DModel } from './Live2DModel'
import { VrmModel } from './VrmModel'
import { avatarCardStyle } from './avatarTokens'
import { useAvatarLifecycle } from './useAvatarLifecycle'
import { useEveAvatarState } from './useEveAvatarState'
import { useEyeTracking } from './useEyeTracking'
import { useLipSync } from './useLipSync'

export function EveAvatar({
  size = 'md',
  presetId = null,
  prefs,
  activeModel,
  // Eve state passthrough
  isSending = false,
  isEveSpeaking = false,
  isEveThinking = false,
  thinkingText = '',
  activeTool = null,
  streamText = '',
  sttStatus = 'idle',
  sttRecording = false,
  error = '',
  audioRef = null,
  onToggleRenderer,
  className = '',
  style = {},
}) {
  const effectivePrefs = prefs || AVATAR_DEFAULTS
  const model = activeModel || { url: '/avatars/vrm/eve-mono.vrm', renderer: 'vrm', id: 'eve-mono-vrm' }
  const containerRef = useRef(null)

  const avatarState = useEveAvatarState({ isSending, isEveSpeaking, isEveThinking, thinkingText, activeTool, streamText, sttStatus, sttRecording, error })
  const lifecycle = useAvatarLifecycle({ renderer: effectivePrefs.renderer, modelUrl: model.url || '' })
  const lip = useLipSync({ isSpeaking: avatarState.isSpeaking, audioRef, enabled: effectivePrefs.motion !== 'reduced' })
  const eye = useEyeTracking({ enabled: effectivePrefs.motion !== 'reduced', containerRef })

  const reducedMotion = effectivePrefs.motion === 'reduced' || lifecycle.prefersReducedMotion
  const emotion = avatarState.emotion

  const tintStyle = avatarCardStyle(presetId, null)
  const scale = effectivePrefs.scale ?? 1

  const resolvedRenderer = lifecycle.resolvedRenderer

  const renderModel = useMemo(() => {
    if (lifecycle.phase === 'timeout' || lifecycle.phase === 'error') {
      return (
        <div className="eve-avatar-error-fallback" role="img" aria-label="Avatar fallback orb">
          <div className={`eve-avatar-orb is-${emotion}`} />
          <span className="eve-avatar-error-text">{lifecycle.error || 'Avatar unavailable'}</span>
        </div>
      )
    }
    if (resolvedRenderer === 'live2d') {
      return (
        <Live2DModel
          url={model.url}
          mouthOpen={lip.mouthOpen}
          lookAt={eye.lookAt}
          isBlinking={eye.isBlinking}
          emotion={emotion}
          onReady={lifecycle.markReady}
        />
      )
    }
    return (
      <VrmModel
        url={model.url}
        mouthOpen={lip.mouthOpen}
        lookAt={eye.lookAt}
        isBlinking={eye.isBlinking}
        emotion={emotion}
        onReady={lifecycle.markReady}
        onError={lifecycle.markError}
      />
    )
  }, [emotion, eye.isBlinking, eye.lookAt, lifecycle, lip.mouthOpen, model.url, resolvedRenderer])

  return (
    <div
      ref={containerRef}
      className={`eve-avatar eve-avatar--${size} is-${emotion} ${reducedMotion ? 'is-reduced' : ''} ${className}`}
      data-eve-target="eve-avatar"
      data-emotion={emotion}
      data-renderer={resolvedRenderer}
      style={{ ...tintStyle, '--eve-avatar-scale': String(scale), ...style }}
    >
      <div className="eve-avatar-card">
        <div className="eve-avatar-card-header">
          <span className="eve-avatar-title">Eve</span>
          <span className={`eve-avatar-status-dot is-${emotion}`} aria-hidden="true" />
          <span className="eve-avatar-model-label" title={model.id}>{model.id}</span>
          {onToggleRenderer ? (
            <button type="button" className="eve-avatar-renderer-toggle" onClick={onToggleRenderer} aria-label="Toggle avatar renderer" title={`Renderer: ${resolvedRenderer} (click to toggle)`}>
              {resolvedRenderer === 'live2d' ? '2D' : '3D'}
            </button>
          ) : null}
        </div>
        <EveAvatarCanvas
          emotion={emotion}
          mouthOpen={lip.mouthOpen}
          lookAt={eye.lookAt}
          isBlinking={eye.isBlinking}
          reducedMotion={reducedMotion}
          audioRef={audioRef}
          modelUrl={model.url}
          renderer={resolvedRenderer}
          onReady={lifecycle.markReady}
          onError={lifecycle.markError}
        >
          {renderModel}
        </EveAvatarCanvas>
        <div className="eve-avatar-card-footer">
          <span className="eve-avatar-emotion">{emotion}</span>
          {activeTool ? <span className="eve-avatar-tool" title={String(activeTool)}>tool: {String(activeTool).slice(0, 18)}</span> : null}
          {error ? <span className="eve-avatar-error" role="alert">{String(error).slice(0, 60)}</span> : null}
        </div>
      </div>
    </div>
  )
}
