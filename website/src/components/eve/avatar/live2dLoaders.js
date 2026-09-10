let PixiModule = null
let Live2DFactory = null

export async function ensurePixi() {
  if (PixiModule) return PixiModule
  const mod = await import('pixi.js')
  PixiModule = mod
  if (typeof window !== 'undefined') window.PIXI = mod
  return PixiModule
}

export async function ensureLive2D() {
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

export const FIT_MARGIN = 0.92
