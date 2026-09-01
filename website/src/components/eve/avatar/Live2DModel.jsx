import { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'

let Live2DFactory = null

async function ensureLive2D() {
  if (Live2DFactory) return Live2DFactory
  try {
    const mod = await import('pixi-live2d-display/cubism4')
    Live2DFactory = mod.Live2DModel
    // pixi-live2d-display expects global PIXI
    if (typeof window !== 'undefined') window.PIXI = PIXI
    return Live2DFactory
  } catch {
    return null
  }
}

export function Live2DModel({ url, mouthOpen = 0, lookAt = { x: 0, y: 0 }, isBlinking = false, emotion = 'idle', onReady, onError }) {
  const mountRef = useRef(null)
  const appRef = useRef(null)
  const modelRef = useRef(null)
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
    const app = new PIXI.Application({
      width: mount.clientWidth || 320,
      height: mount.clientHeight || 240,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio, 1.8),
    })
    mount.appendChild(app.view)
    appRef.current = app

    const ticker = () => {
      const model = modelRef.current
      if (!model) return
      const mouth = mouthRef.current
      // Drive Live2D parameters if available
      try {
        if (model.internalModel?.coreModel) {
          model.internalModel.coreModel.setParamFloat('ParamMouthOpenY', Math.max(0, Math.min(1, mouth)))
          model.internalModel.coreModel.setParamFloat('ParamEyeLOpen', blinkRef.current ? 0 : 1)
          model.internalModel.coreModel.setParamFloat('ParamEyeROpen', blinkRef.current ? 0 : 1)
          // look
          model.internalModel.coreModel.setParamFloat('ParamAngleX', lookRef.current.x * 30)
          model.internalModel.coreModel.setParamFloat('ParamAngleY', -lookRef.current.y * 20)
          model.internalModel.coreModel.setParamFloat('ParamBodyAngleX', lookRef.current.x * 10)
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
    app.ticker.add(ticker)

    const onResize = () => {
      const w = mount.clientWidth || 320
      const h = mount.clientHeight || 240
      app.renderer.resize(w, h)
      const m = modelRef.current
      if (m) {
        const scale = Math.min(w / m.width, h / m.height) * 0.9
        m.scale.set(scale)
        m.x = w / 2
        m.y = h * 0.88
      }
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    return () => {
      try { app.ticker.remove(ticker) } catch {}
      ro.disconnect()
      try {
        if (modelRef.current) modelRef.current.destroy?.({ texture: true, baseTexture: true })
      } catch {}
      try { app.destroy(true, { texture: true, baseTexture: true }) } catch {}
      try { if (mount.contains(app.view)) mount.removeChild(app.view) } catch {}
      appRef.current = null
      modelRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!url) {
      setStatus('fallback')
      handleReady()
      return
    }
    // placeholder check
    if (url === '/avatars/live2d/haru/Haru.model3.json' || url === '/avatars/live2d/unitychan/unitychan.model3.json') {
      fetch(url, { method: 'HEAD' }).then((r) => {
        if (!r.ok) {
          setStatus('fallback')
          handleReady()
        } else {
          doLoad(url)
        }
      }).catch(() => {
        setStatus('fallback')
        handleReady()
      })
      return
    }
    doLoad(url)

    async function doLoad(targetUrl) {
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
          model.scale.set(scale)
          model.x = w / 2
          model.y = h * 0.88
          model.anchor?.set?.(0.5, 0.5)
          app.stage.addChild(model)
        }
        handleReady()
      } catch (err) {
        handleFail(err?.message || 'Failed to load Live2D model')
      }
    }
  }, [handleFail, handleReady, url])

  return (
    <div
      className={`eve-live2d-real is-${emotion} ${isBlinking ? 'is-blinking' : ''}`}
      data-testid="live2d-model"
      role="img"
      aria-label={`Eve Live2D avatar, ${emotion}`}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <div
        ref={mountRef}
        className="eve-live2d-mount"
        style={{ width: '100%', height: '100%', minHeight: 180, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-primary)' }}
      />
      {status === 'loading' && <span className="eve-live2d-badge">Loading Live2D…</span>}
      {status === 'fallback' && (
        <span className="eve-live2d-badge" title={loadError || url}>{loadError ? 'Fallback' : (url ? url.split('/').pop() : 'Haru Live2D')}</span>
      )}
    </div>
  )
}
