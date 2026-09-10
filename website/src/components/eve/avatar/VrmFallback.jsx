export function VrmFallback({ emotion, isBlinking, mouthOpen, lookAt, status, loadError }) {
  return (
    <div
      className={`eve-vrm-fallback is-${emotion} ${isBlinking ? 'is-blinking' : ''}`}
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
      <span className="eve-vrm-url" aria-hidden="true">{status === 'loading' ? 'Loading 3D — anime VRM 10MB…' : (loadError ? 'Fallback — CSS avatar' : 'Anime VRM ready')}</span>
    </div>
  )
}
