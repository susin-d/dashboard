import { useCallback, useEffect, useRef, useState } from 'react'
let PixiModule = null
let Live2DFactory = null

async function ensurePixi() {
  if (PixiModule) return PixiModule
  const mod = await import('pixi.js')
  PixiModule = mod
  // pixi-live2d-display expects global PIXI
  if (typeof window !== 'undefined') window.PIXI = mod
  return PixiModule
}

async function ensureLive2D() {
  if (Live2DFactory) return Live2DFactory
  const PIXI = await ensurePixi()
  void PIXI
  // Cubism 4 models need the proprietary core (window.Live2DCubismCore),
  // shipped at /live2d/live2dcubismcore.min.js and preloaded via index.html.
  // If the preload missed (cached HTML, offline first run), inject it on demand.
  if (typeof window !== 'undefined' && !window.Live2DCubismCore) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = '/live2d/live2dcubismcore.min.js'
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Live2D core script failed to load'))
        document.head.appendChild(script)
      })
    } catch {
      return null
    }
  }
  if (typeof window !== 'undefined' && !window.Live2DCubismCore) return null
  try {
    const mod = await import('pixi-live2d-display/cubism4')
    Live2DFactory = mod.Live2DModel
    return Live2DFactory
  } catch {
    return null
  }
}

export function Live2DModel({ url, mouthOpen = 0, lookAt = { x: 0, y: 0 }, isBlinking = false, emotion = 'idle', zoom = 1, idleMotion = true, onReady, onError }) {
  const mountRef = useRef(null)
  const appRef = useRef(null)
  const modelRef = useRef(null)
  const cleanupRef = useRef(null)
  const baseScaleRef = useRef(1)
  const zoomRef = useRef(1)
  const idleMotionRef = useRef(true)
  const idleMotionActiveRef = useRef(false)
  const loopRunningRef = useRef(false)
  const loadIdRef = useRef(0)
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const mouthRef = useRef(0)
  const lookRef = useRef({ x: 0, y: 0 })
  const blinkRef = useRef(false)
  const emotionRef = useRef(emotion)

  mouthRef.current = mouthOpen
  lookRef.current = lookAt
  blinkRef.current = isBlinking
  emotionRef.current = emotion
  zoomRef.current = zoom
  idleMotionRef.current = idleMotion

  // Loop the model's built-in Idle motion group (Haru ships one). Replays on
  // finish; models without the group reject immediately and fall back to the
  // param sway in the ticker below.
  const startIdleLoop = useCallback((model) => {
    if (!model || loopRunningRef.current || typeof model.motion !== 'function') return
    loopRunningRef.current = true
    const myLoad = loadIdRef.current
    const loop = async () => {
      while (loadIdRef.current === myLoad && modelRef.current === model) {
        if (!idleMotionRef.current) break
        idleMotionActiveRef.current = true
        try {
          await model.motion('Idle')
        } catch {
          idleMotionActiveRef.current = false
          break
        }
      }
      idleMotionActiveRef.current = false
      loopRunningRef.current = false
    }
    loop()
  }, [])

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
    let app = null
    let ro = null

    ensurePixi().then((PIXI) => {
      if (cancelled || !mountRef.current) return
      app = new PIXI.Application({
        width: mount.clientWidth || 320,
        height: mount.clientHeight || 240,
        backgroundAlpha: 0,
        antialias: false,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 1),
        powerPreference: 'low-power',
      })
      mount.appendChild(app.view)
      appRef.current = app

    const ticker = () => {
      const model = modelRef.current
      if (!model) return
      const mouth = mouthRef.current
      // Drive Live2D parameters if available. Runs at LOW ticker priority so
      // the model's internal update (motion curves, physics) runs first and
      // our lip/look writes land on top instead of being overwritten.
      try {
        if (model.internalModel?.coreModel) {
          const core = model.internalModel.coreModel
          core.setParamFloat('ParamMouthOpenY', Math.max(0, Math.min(1, mouth)))
          core.setParamFloat('ParamEyeLOpen', blinkRef.current ? 0 : 1)
          core.setParamFloat('ParamEyeROpen', blinkRef.current ? 0 : 1)
          if (!idleMotionActiveRef.current) {
            // No Idle motion owns the body: steer toward the pointer plus a
            // gentle sway fallback so stub-less models still feel alive.
            const t = performance.now() * 0.001
            const swayX = idleMotionRef.current ? Math.sin(t * 1.1) * 2.5 : 0
            const swayY = idleMotionRef.current ? Math.sin(t * 0.9 + 1) * 1.5 : 0
            core.setParamFloat('ParamAngleX', lookRef.current.x * 30 + swayX)
            core.setParamFloat('ParamAngleY', -lookRef.current.y * 20 + swayY)
            core.setParamFloat('ParamBodyAngleX', lookRef.current.x * 10 + swayX * 0.4)
          }
          // emotion: map to ParamA
          if (emotionRef.current === 'tool') {
            model.internalModel.coreModel.setParamFloat('ParamA', 0.7)
          } else if (emotionRef.current === 'error') {
            model.internalModel.coreModel.setParamFloat('ParamA', -0.6)
          }
        } else if (model.mouth !== undefined) {
          model.mouth = mouthRef.current
        }
      } catch {}
    }
      app.ticker.add(ticker, undefined, PIXI.UPDATE_PRIORITY?.LOW ?? -10)

      const onResize = () => {
        const w = mount.clientWidth || 320
        const h = mount.clientHeight || 240
        app.renderer.resize(w, h)
        const m = modelRef.current
        if (m) {
          const scale = Math.min(w / m.width, h / m.height) * 0.9
          baseScaleRef.current = scale
          m.scale.set(scale * zoomRef.current)
          m.x = w / 2
          m.y = h * 0.88
        }
      }
      ro = new ResizeObserver(onResize)
      ro.observe(mount)

      // Pause the shared ticker when the tab is hidden or the canvas scrolls
      // off-screen — stops GPU renders + motion eval instead of burning
      // cycles on an invisible avatar. Pending Idle motions simply wait.
      let mountIsVisible = true
      const updateTickerRunning = () => {
        try {
          if (document.hidden || !mountIsVisible) app.ticker.stop()
          else app.ticker.start()
        } catch {}
      }
      const visibilityObserver = new IntersectionObserver(
        (entries) => {
          mountIsVisible = entries[0]?.isIntersecting !== false
          updateTickerRunning()
        },
        { threshold: 0 },
      )
      visibilityObserver.observe(mount)
      const onVisibility = () => updateTickerRunning()
      document.addEventListener('visibilitychange', onVisibility)

      const destroyApp = () => {
        try { app.ticker.remove(ticker) } catch {}
        try { ro?.disconnect() } catch {}
        try { visibilityObserver.disconnect() } catch {}
        try { document.removeEventListener('visibilitychange', onVisibility) } catch {}
        try {
          if (modelRef.current) modelRef.current.destroy?.({ texture: true, baseTexture: true })
        } catch {}
        try { app.destroy(true, { texture: true, baseTexture: true }) } catch {}
        try { if (mount.contains(app.view)) mount.removeChild(app.view) } catch {}
        appRef.current = null
        modelRef.current = null
      }
      // If the component unmounted while pixi was still loading, destroy now.
      if (cancelled) {
        destroyApp()
      } else {
        cleanupRef.current = destroyApp
      }
    })

    return () => {
      cancelled = true
      if (typeof cleanupRef.current === 'function') {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!url) {
      setStatus('fallback')
      handleReady()
      return
    }
    // Unlisted stub files stay on disk for manual testing — load them like
    // any other URL; the loader error path falls back to the CSS avatar.
    doLoad(url)
    return () => { loadIdRef.current += 1 }

    async function doLoad(targetUrl) {
      loadIdRef.current += 1
      setStatus('loading')
      setLoadError('')
      const Factory = await ensureLive2D()
      if (!Factory) {
        handleFail('Live2D runtime not available — fallback')
        return
      }
      try {
        const model = await Factory.from(targetUrl, { ticker: appRef.current?.ticker })
        modelRef.current = model
        const mount = mountRef.current
        const app = appRef.current
        if (mount && app) {
          const w = mount.clientWidth || 320
          const h = mount.clientHeight || 240
          const scale = Math.min(w / model.width, h / model.height) * 0.9
          baseScaleRef.current = scale
          model.scale.set(scale * zoomRef.current)
          model.x = w / 2
          model.y = h * 0.88
          model.anchor?.set?.(0.5, 0.5)
          app.stage.addChild(model)
        }
        if (idleMotionRef.current) startIdleLoop(model)
        handleReady()
      } catch (err) {
        handleFail(err?.message || 'Failed to load Live2D model')
      }
    }
  }, [handleFail, handleReady, startIdleLoop, url])

  // Restart the Idle loop if motion was re-enabled while a model is loaded
  useEffect(() => {
    if (idleMotion && modelRef.current && !loopRunningRef.current) {
      startIdleLoop(modelRef.current)
    }
  }, [idleMotion, startIdleLoop])

  // Studio zoom slider rescales the fitted model without reloading textures
  useEffect(() => {
    const m = modelRef.current
    if (!m) return
    const z = Number(zoom)
    m.scale.set(baseScaleRef.current * (Number.isFinite(z) ? z : 1))
  }, [zoom])

  return (
    <div
      className={`eve-live2d-real is-${emotion} ${isBlinking ? 'is-blinking' : ''}`}
      data-testid="live2d-model"
      role="img"
      aria-label={`Eve Live2D avatar, ${emotion}`}
    >
      <div ref={mountRef} className="eve-live2d-mount" />
      {status === 'loading' && <span className="eve-live2d-badge">Loading Live2D…</span>}
      {status === 'fallback' && (
        <span className="eve-live2d-badge" title={loadError || url}>{loadError ? 'Fallback' : (url ? url.split('/').pop() : 'Haru Live2D')}</span>
      )}
    </div>
  )
}
