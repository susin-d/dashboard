import { useCallback, useEffect, useRef, useState } from 'react'

let PixiModule = null
let Live2DFactory = null

async function ensurePixi() {
  if (PixiModule) return PixiModule
  const mod = await import('pixi.js')
  PixiModule = mod
  if (typeof window !== 'undefined') window.PIXI = mod
  return PixiModule
}

async function ensureLive2D() {
  if (Live2DFactory) return Live2DFactory
  const PIXI = await ensurePixi()
  if (typeof window !== 'undefined' && !window.Live2DCubismCore) {
    try {
      await new Promise((resolve) => {
        const existing = document.querySelector('script[src*="live2dcubismcore"]')
        if (existing && window.Live2DCubismCore) { resolve(); return }
        const script = document.createElement('script')
        script.src = '/live2d/live2dcubismcore.min.js'
        script.onload = () => resolve()
        script.onerror = () => resolve()
        document.head.appendChild(script)
      })
    } catch {}
  }
  try {
    const mod = await import('pixi-live2d-display/cubism4')
    Live2DFactory = mod.Live2DModel
    if (typeof Live2DFactory.registerTicker === 'function' && PIXI?.Ticker) {
      try { Live2DFactory.registerTicker(PIXI.Ticker) } catch {}
    }
    return Live2DFactory
  } catch (err) {
    console.warn('[Live2D] Cubism4 runtime import failed:', err)
    return null
  }
}

export function Live2DModel({
  url,
  mouthOpen = 0,
  lookAt = { x: 0, y: 0 },
  isBlinking = false,
  emotion = 'idle',
  zoom = 1,
  idleMotion = true,
  onReady,
  onError,
}) {
  const mountRef = useRef(null)
  const appRef = useRef(null)
  const modelRef = useRef(null)
  const baseScaleRef = useRef(1)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const idleMotionRef = useRef(idleMotion)
  idleMotionRef.current = idleMotion
  const mouthRef = useRef(mouthOpen)
  mouthRef.current = mouthOpen
  const lookRef = useRef(lookAt)
  lookRef.current = lookAt
  const blinkRef = useRef(isBlinking)
  blinkRef.current = isBlinking
  const emotionRef = useRef(emotion)
  emotionRef.current = emotion
  const loadIdRef = useRef(0)

  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')

  const handleReady = useCallback(() => {
    setStatus('ready')
    onReady?.()
  }, [onReady])

  const handleFail = useCallback((message) => {
    setStatus('fallback')
    setLoadError(message || 'Could not load Live2D')
    onError?.(message)
    onReady?.()
  }, [onError, onReady])

  useEffect(() => {
    if (!mountRef.current) return undefined
    const mount = mountRef.current
    let cancelled = false
    let ro = null
    let motionCleanup = null
    const currentLoadId = ++loadIdRef.current

    setStatus('loading')
    setLoadError('')

    const setup = async () => {
      try {
        const PIXI = await ensurePixi()
        if (cancelled || !mountRef.current) return

        const Factory = await ensureLive2D()
        if (cancelled || !mountRef.current) return

        if (!Factory) {
          handleFail('Live2D runtime not supported in this browser')
          return
        }

        // Clean up previous app if any
        if (appRef.current) {
          try {
            appRef.current.destroy(true, { children: true, texture: true, baseTexture: true })
          } catch {}
          appRef.current = null
        }

        const initialW = Math.max(120, mount.clientWidth || 320)
        const initialH = Math.max(120, mount.clientHeight || 240)

        const app = new PIXI.Application({
          width: initialW,
          height: initialH,
          backgroundAlpha: 0,
          antialias: false,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 1),
          powerPreference: 'low-power',
        })

        if (cancelled || !mountRef.current) {
          try { app.destroy(true) } catch {}
          return
        }

        appRef.current = app
        mount.appendChild(app.view)
        app.view.style.width = '100%'
        app.view.style.height = '100%'
        app.view.style.display = 'block'

        if (!url) {
          handleFail('No Live2D model URL provided')
          return
        }

        // Load the Live2D model with autoInteract: false to prevent Pixi v7 legacy interaction crash
        let model = null
        try {
          model = await Factory.from(url, { autoInteract: false })
          if (model) {
            // PixiJS v7 eventMode replaces deprecated interactive flag
            model.eventMode = 'none'
            model.interactive = false
          }
        } catch (err) {
          if (!cancelled) handleFail(err?.message || 'Failed to parse Live2D model')
          return
        }

        if (cancelled || !mountRef.current || currentLoadId !== loadIdRef.current) {
          try { model?.destroy?.({ texture: true, baseTexture: true }) } catch {}
          return
        }

        modelRef.current = model

        const w = Math.max(120, mount.clientWidth || 320)
        const h = Math.max(120, mount.clientHeight || 240)
        app.renderer.resize(w, h)

        const mw = model.width || 400
        const mh = model.height || 400
        const scale = Math.min(w / mw, h / mh) * 0.85
        baseScaleRef.current = scale
        const currentZoom = Number(zoomRef.current) || 1
        model.scale.set(scale * currentZoom)

        // Center model in the view: anchor at center (0.5, 0.5) and position at (w/2, h/2)
        model.anchor?.set?.(0.5, 0.5)
        model.x = w / 2
        model.y = h * 0.52

        app.stage.addChild(model)

        // Idle motion playback loop
        if (typeof model.motion === 'function') {
          let running = true
          const loop = async () => {
            while (running && currentLoadId === loadIdRef.current && modelRef.current === model) {
              if (!idleMotionRef.current) {
                await new Promise((r) => setTimeout(r, 1000))
                continue
              }
              try {
                const res = await model.motion('Idle')
                if (!res) await new Promise((r) => setTimeout(r, 1200))
              } catch {
                await new Promise((r) => setTimeout(r, 2000))
              }
            }
          }
          loop()
          motionCleanup = () => { running = false }
        }

        // ResizeObserver for dynamic container adjustments
        const onResize = () => {
          if (!mount || !appRef.current || !modelRef.current) return
          const nw = Math.max(120, mount.clientWidth || 320)
          const nh = Math.max(120, mount.clientHeight || 240)
          try {
            appRef.current.renderer.resize(nw, nh)
            const m = modelRef.current
            const mScale = Math.min(nw / (m.width || 400), nh / (m.height || 400)) * 0.85
            baseScaleRef.current = mScale
            m.scale.set(mScale * (Number(zoomRef.current) || 1))
            m.x = nw / 2
            m.y = nh * 0.52
          } catch {}
        }
        ro = new ResizeObserver(onResize)
        ro.observe(mount)

        handleReady()
      } catch (err) {
        if (!cancelled) {
          console.warn('[Live2D] Setup error:', err)
          handleFail(err?.message || 'Live2D initialization error')
        }
      }
    }

    setup()

    return () => {
      cancelled = true
      if (motionCleanup) motionCleanup()
      if (ro) ro.disconnect()
      if (modelRef.current) {
        try { modelRef.current.destroy?.({ texture: true, baseTexture: true }) } catch {}
        modelRef.current = null
      }
      if (appRef.current) {
        try {
          const app = appRef.current
          if (mount && mount.contains(app.view)) mount.removeChild(app.view)
          app.destroy(true, { children: true, texture: true, baseTexture: true })
        } catch {}
        appRef.current = null
      }
    }
  }, [handleFail, handleReady, url])

  // Live update zoom
  useEffect(() => {
    const m = modelRef.current
    if (!m) return
    const z = Number(zoom)
    const safeZoom = Number.isFinite(z) ? Math.min(2, Math.max(0.5, z)) : 1
    try {
      m.scale.set(baseScaleRef.current * safeZoom)
      if (appRef.current && mountRef.current) {
        const nw = mountRef.current.clientWidth || 320
        const nh = mountRef.current.clientHeight || 240
        m.x = nw / 2
        m.y = nh * 0.52
      }
    } catch {}
  }, [zoom])

  const showCssFallback = status === 'fallback'

  return (
    <div
      className={`eve-live2d-real is-${emotion} ${isBlinking ? 'is-blinking' : ''}`}
      data-testid="live2d-model"
      role="img"
      aria-label={`Eve Live2D avatar, ${emotion}`}
    >
      <div ref={mountRef} className="eve-live2d-mount" />

      {/* Procedural fallback if Live2D cannot render */}
      {showCssFallback && (
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
          <span className="eve-vrm-url" aria-hidden="true">
            {loadError ? `Fallback — ${loadError}` : 'Live2D Haru ready'}
          </span>
        </div>
      )}

      {status === 'loading' && <span className="eve-live2d-badge">Loading Live2D…</span>}
      {status === 'fallback' && loadError && (
        <span className="eve-live2d-badge" title={loadError}>{loadError}</span>
      )}
    </div>
  )
}
