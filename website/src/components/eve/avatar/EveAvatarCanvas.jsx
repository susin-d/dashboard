import { Suspense, useRef } from 'react'
import { useEyeTracking } from './useEyeTracking'
import { useLipSync } from './useLipSync'

export function EveAvatarCanvas({
  emotion = 'idle',
  mouthOpen = 0,
  lookAt = { x: 0, y: 0 },
  isBlinking = false,
  reducedMotion = false,
  audioRef = null,
  modelUrl = '',
  renderer = 'vrm',
  onReady,
  onError,
  children,
}) {
  const containerRef = useRef(null)
  const eye = useEyeTracking({ enabled: !reducedMotion, containerRef })
  const lip = useLipSync({ isSpeaking: emotion === 'speaking', audioRef, enabled: !reducedMotion })

  const effectiveMouth = reducedMotion ? 0 : (mouthOpen ?? lip.mouthOpen ?? 0)
  const effectiveLookAt = reducedMotion ? { x: 0, y: 0 } : (lookAt?.x !== undefined ? lookAt : eye.lookAt)
  const effectiveBlink = reducedMotion ? false : (isBlinking || eye.isBlinking)

  return (
    <div
      ref={containerRef}
      className={`eve-avatar-canvas eve-avatar-canvas--${renderer} is-${emotion} ${effectiveBlink ? 'is-blink' : ''} ${reducedMotion ? 'is-reduced' : ''}`}
      data-eve-target="eve-avatar-canvas"
      data-renderer={renderer}
      data-emotion={emotion}
      style={{ '--eve-mouth-open': String(effectiveMouth), '--eve-look-x': String(effectiveLookAt.x), '--eve-look-y': String(effectiveLookAt.y) }}
      aria-hidden="true"
    >
      <Suspense fallback={<div className="eve-avatar-loading" role="status" aria-label="Loading avatar" />}>
        {children && typeof children === 'function' ? children({ mouthOpen: effectiveMouth, lookAt: effectiveLookAt, isBlinking: effectiveBlink, modelUrl, renderer, onReady, onError, emotion }) : children}
      </Suspense>
      <div className="eve-avatar-canvas-overlay">
        <span className="eve-avatar-emotion-badge">{emotion}</span>
        <span className="eve-avatar-renderer-badge">{renderer}</span>
      </div>
    </div>
  )
}
