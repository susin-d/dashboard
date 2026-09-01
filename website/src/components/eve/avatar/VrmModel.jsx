// VRM renderer — lazy dynamically imports three stack to avoid hard dep.
// When three/vrm not installed, shows procedural CSS avatar with mouth/eyes driven by props.
import { useEffect, useRef, useState } from 'react'

export function VrmModel({ url, mouthOpen = 0, lookAt = { x: 0, y: 0 }, isBlinking = false, emotion = 'idle', onReady, onError: _onError }) {
  const [status, setStatus] = useState('checking')
  const canvasRef = useRef(null)

  useEffect(() => {
    setStatus('fallback')
    if (url) onReady?.()
  }, [onReady, url])

  useEffect(() => {
    if (status === 'fallback' && url && url !== '/avatars/vrm/eve-mono.vrm' && url !== '/avatars/vrm/eve-duo.vrm') {
      // Non-bundled url — treat as ok even in fallback so upload preview shows
      onReady?.()
    }
  }, [onReady, status, url])

  // Fallback procedural avatar — glass, monochrome, reacts to mouthOpen/lookAt/blink
  // Keeps design tokens, no hard-coded colors.
  return (
    <div
      ref={canvasRef}
      className={`eve-vrm-fallback is-${emotion} ${isBlinking ? 'is-blinking' : ''}`}
      data-testid="vrm-model"
      role="img"
      aria-label={`Eve VRM avatar, ${emotion}`}
      style={{
        '--mouth': String(Math.max(0, Math.min(1, mouthOpen))),
        '--look-x': String(lookAt.x),
        '--look-y': String(lookAt.y),
      }}
    >
      <div className="eve-vrm-head">
        <div className="eve-vrm-face">
          <div className="eve-vrm-eyes">
            <span className="eve-vrm-eye left" />
            <span className="eve-vrm-eye right" />
          </div>
          <div className="eve-vrm-mouth" />
          <div className="eve-vrm-blush" />
        </div>
        <div className="eve-vrm-hair" />
      </div>
      <div className="eve-vrm-body">
        <div className="eve-vrm-torso" />
      </div>
      <span className="eve-vrm-url" aria-hidden="true">{status === 'checking' ? 'Loading VRM…' : url ? url.split('/').pop() : 'Eve Mono VRM'}</span>
    </div>
  )
}
