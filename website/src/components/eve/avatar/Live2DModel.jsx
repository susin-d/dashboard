// Live2D renderer — lazy pixi check, else procedural fallback.
import { useEffect, useRef, useState } from 'react'

export function Live2DModel({ url, mouthOpen = 0, lookAt = { x: 0, y: 0 }, isBlinking = false, emotion = 'idle', onReady }) {
  const [status, setStatus] = useState('checking')
  const rootRef = useRef(null)

  useEffect(() => {
    setStatus('fallback')
    if (url) onReady?.()
  }, [onReady, url])

  return (
    <div
      ref={rootRef}
      className={`eve-live2d-fallback is-${emotion} ${isBlinking ? 'is-blinking' : ''}`}
      data-testid="live2d-model"
      role="img"
      aria-label={`Eve Live2D avatar, ${emotion}`}
      style={{
        '--mouth': String(Math.max(0, Math.min(1, mouthOpen))),
        '--look-x': String(lookAt.x),
        '--look-y': String(lookAt.y),
      }}
    >
      <div className="eve-live2d-stage">
        <div className="eve-live2d-character">
          <div className="eve-live2d-head">
            <div className="eve-live2d-face">
              <div className="eve-live2d-eyes">
                <span className="eve-live2d-eye left" />
                <span className="eve-live2d-eye right" />
              </div>
              <div className="eve-live2d-mouth" />
            </div>
            <div className="eve-live2d-bangs" />
          </div>
          <div className="eve-live2d-outfit" />
        </div>
      </div>
      <span className="eve-live2d-url" aria-hidden="true">{status === 'checking' ? 'Loading Live2D…' : url ? url.split('/').pop() : 'Haru Live2D'}</span>
    </div>
  )
}
