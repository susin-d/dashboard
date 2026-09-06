import "../styles/pages/avatar.css"
import { useEffect, useRef, useState } from 'react'
import { Eye, Frame, GlassWater, Heart, Mic, Minus, Monitor, Orbit, PanelRight, Plus, RotateCcw, Save, Settings2, Smartphone, Sparkles, TestTube, Trash2, Upload, X, Zap } from 'lucide-react'
import { EmptyState, CustomDropdown } from '../components/ui'
import { EveAvatar } from '../components/eve/avatar/EveAvatar'
import { AVATAR_CATALOG, AVATAR_LIMITS, AVATAR_DEFAULTS, clampUserPan, clampZoom } from '../components/eve/avatar/avatarConstants'
import { useEveAvatar } from '../components/eve/avatar/EveAvatarProvider'
import { getAvatarPreferences, listAvatarModels, saveAvatarPreferences, uploadAvatarModel, deleteAvatarModel } from '../lib/eveAvatarApi'
import { useThemeCustomizer } from '../hooks/useThemeCustomizer'

function isTauri() {
  try { return typeof window !== 'undefined' && !!window.__TAURI__ } catch { return false }
}

const EMOTIONS = ['idle', 'listening', 'thinking', 'speaking', 'tool', 'error']
const RENDERER_OPTIONS = [
  { value: 'auto', label: 'Auto (recommended)' },
  { value: 'vrm', label: '3D VRM' },
  { value: 'live2d', label: 'Live2D (Cubism)' },
]
const MOTION_OPTIONS = [
  { value: 'auto', label: 'Auto (respect OS)' },
  { value: 'on', label: 'On' },
  { value: 'reduced', label: 'Reduced' },
]

const SAVE_MESSAGE_TIMEOUT_MS = 1800
const UPLOAD_MESSAGE_TIMEOUT_MS = 2200
const SCALE_SAVE_DEBOUNCE_MS = 350
const OVERLAY_RESIZE_DEBOUNCE_MS = 400
const FRAMING_SAVE_DEBOUNCE_MS = 350
const ZOOM_STEP = 0.1

export function AvatarPage({ onNavigate }) {
  const { prefs, setPrefs, activeModel } = useEveAvatar()
  const { activePreset } = useThemeCustomizer() || {}
  const [remoteModels, setRemoteModels] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [previewEmotion, setPreviewEmotion] = useState('idle')
  const [previewSpeaking, setPreviewSpeaking] = useState(false)
  const [viewResetKey, setViewResetKey] = useState(0)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [controlsHidden, setControlsHidden] = useState(false)
  const fileRef = useRef(null)
  const scaleSaveTimeoutRef = useRef(0)
  const zoomSaveTimeoutRef = useRef(0)
  const overlayResizeTimeoutRef = useRef(0)
  const framingSaveTimeoutRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [prefRes, modelRes] = await Promise.all([
          getAvatarPreferences().catch(() => null),
          listAvatarModels().catch(() => null),
        ])
        if (cancelled) return
        if (prefRes?.preferences) setPrefs(prefRes.preferences)
        if (modelRes?.models) setRemoteModels(modelRes.models)
      } catch {
        if (!cancelled) setError('Could not load avatar settings.')
      }
    }
    load()
    return () => { cancelled = true }
  }, [setPrefs])

  useEffect(() => () => {
    window.clearTimeout(scaleSaveTimeoutRef.current)
    window.clearTimeout(zoomSaveTimeoutRef.current)
    window.clearTimeout(overlayResizeTimeoutRef.current)
    window.clearTimeout(framingSaveTimeoutRef.current)
  }, [])

  const persistOverlaySize = (dimension, value) => {
    const currentSize = prefs?.overlaySize || AVATAR_DEFAULTS.overlaySize
    const next = { ...prefs, overlaySize: { ...currentSize, [dimension]: value } }
    setPrefs(next)
    setError('')
    window.clearTimeout(overlayResizeTimeoutRef.current)
    overlayResizeTimeoutRef.current = window.setTimeout(async () => {
      try {
        const res = await saveAvatarPreferences(next)
        if (res?.preferences) setPrefs(res.preferences)
        const { w, h } = next.overlaySize
        if (isTauri()) {
          const { invoke } = await import('@tauri-apps/api/core')
          invoke('resize_overlay', { w: Number(w), h: Number(h) }).catch(() => {})
        }
      } catch (err) {
        setError(err?.message || 'Could not save overlay size.')
      }
    }, OVERLAY_RESIZE_DEBOUNCE_MS)
  }

  const persist = async (patch) => {
    setBusy(true)
    setError(''); setMessage('')
    const next = { ...prefs, ...patch }
    setPrefs(next)
    try {
      const res = await saveAvatarPreferences(next)
      if (res?.preferences) setPrefs(res.preferences)
      setMessage('Saved.')
      window.setTimeout(() => setMessage(''), SAVE_MESSAGE_TIMEOUT_MS)
    } catch (err) {
      setError(err?.message || 'Could not save.')
    } finally { setBusy(false) }
  }

  const persistScale = (scale) => {
    const next = { ...prefs, scale }
    setPrefs(next)
    setError('')
    window.clearTimeout(scaleSaveTimeoutRef.current)
    scaleSaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        const res = await saveAvatarPreferences(next)
        if (res?.preferences) setPrefs(res.preferences)
        setMessage('Saved.')
        window.setTimeout(() => setMessage(''), SAVE_MESSAGE_TIMEOUT_MS)
      } catch (err) {
        setError(err?.message || 'Could not save.')
      }
    }, SCALE_SAVE_DEBOUNCE_MS)
  }

  const persistZoom = (zoom) => {
    const next = { ...prefs, zoom }
    setPrefs(next)
    setError('')
    window.clearTimeout(zoomSaveTimeoutRef.current)
    zoomSaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        const res = await saveAvatarPreferences(next)
        if (res?.preferences) setPrefs(res.preferences)
        setMessage('Saved.')
        window.setTimeout(() => setMessage(''), SAVE_MESSAGE_TIMEOUT_MS)
      } catch (err) {
        setError(err?.message || 'Could not save.')
      }
    }, SCALE_SAVE_DEBOUNCE_MS)
  }

  const persistFraming = (pan, zoomVal) => {
    const safePan = clampUserPan(pan)
    const safeZoom = clampZoom(zoomVal)
    const next = { ...prefs, userPan: safePan, zoom: safeZoom }
    setPrefs(next)
    setError('')
    window.clearTimeout(framingSaveTimeoutRef.current)
    framingSaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        const res = await saveAvatarPreferences(next)
        if (res?.preferences) setPrefs(res.preferences)
      } catch (err) {
        setError(err?.message || 'Could not save framing.')
      }
    }, FRAMING_SAVE_DEBOUNCE_MS)
  }

  const handleTransformChange = (pan, zoomVal) => {
    // Optimistic local update; debounced persistence.
    const safePan = clampUserPan(pan)
    const safeZoom = clampZoom(zoomVal)
    setPrefs((c) => ({ ...c, userPan: safePan, zoom: safeZoom }))
    window.clearTimeout(framingSaveTimeoutRef.current)
    framingSaveTimeoutRef.current = window.setTimeout(async () => {
      const next = { ...prefs, userPan: safePan, zoom: safeZoom }
      try {
        const res = await saveAvatarPreferences(next)
        if (res?.preferences) setPrefs(res.preferences)
      } catch (err) {
        setError(err?.message || 'Could not save framing.')
      }
    }, FRAMING_SAVE_DEBOUNCE_MS)
  }

  const handleResetView = () => {
    setViewResetKey((key) => key + 1)
    // Clear user framing + base zoom in one shot.
    setPrefs((c) => ({ ...c, userPan: AVATAR_DEFAULTS.userPan, zoom: 1 }))
    persist({ zoom: 1, userPan: AVATAR_DEFAULTS.userPan })
  }

  const handleResetFraming = () => {
    setViewResetKey((key) => key + 1)
    persistFraming(AVATAR_DEFAULTS.userPan, 1)
    setMessage('Framing reset.')
    window.setTimeout(() => setMessage(''), SAVE_MESSAGE_TIMEOUT_MS)
  }

  const handleZoomStep = (amount) => {
    persistZoom(clampZoom((prefs?.zoom ?? AVATAR_DEFAULTS.zoom) + amount))
  }

  const handleSaveCameraPosition = async () => {
    const next = {
      ...prefs,
      userPan: clampUserPan(prefs?.userPan),
      zoom: clampZoom(prefs?.zoom),
    }
    setBusy(true)
    setError('')
    try {
      const res = await saveAvatarPreferences(next)
      if (res?.preferences) setPrefs(res.preferences)
      setMessage('Camera position saved.')
      window.setTimeout(() => setMessage(''), SAVE_MESSAGE_TIMEOUT_MS)
    } catch (err) {
      setError(err?.message || 'Could not save camera position.')
    } finally {
      setBusy(false)
    }
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const ext = `.${file.name.split('.').pop().toLowerCase()}`
    if (!['.vrm', '.glb', '.gltf', '.zip', '.json'].some((a) => ext === a || file.name.toLowerCase().endsWith('.model3.json'))) {
      setError(`Unsupported ${ext} — use .vrm, .glb, .model3.json or .zip`)
      event.target.value = ''; return
    }
    if (file.size > AVATAR_LIMITS.UPLOAD_MAX_BYTES) { setError('Max 12MB.'); event.target.value = ''; return }
    setBusy(true); setError(''); setMessage('')
    try {
      const res = await uploadAvatarModel(file)
      const pref = res?.preferences || res
      if (pref?.modelId) setPrefs((c) => ({ ...c, modelId: pref.modelId, modelUrl: pref.modelUrl || pref.url || null }))
      if (res?.preferences) setPrefs(res.preferences)
      const models = await listAvatarModels().catch(() => null)
      if (models?.models) setRemoteModels(models.models)
      setMessage(`Uploaded ${file.name} — validated.`)
      window.setTimeout(() => setMessage(''), UPLOAD_MESSAGE_TIMEOUT_MS)
    } catch (err) { setError(err?.message || 'Upload failed.') } finally { setBusy(false); event.target.value = '' }
  }

  const handleDelete = async (modelId) => {
    if (!modelId?.startsWith('upload:')) return
    setBusy(true); setError('')
    try {
      await deleteAvatarModel(modelId)
      setPrefs((c) => ({ ...c, modelId: AVATAR_CATALOG[0].id, modelUrl: null }))
      const models = await listAvatarModels().catch(() => null)
      if (models?.models) setRemoteModels(models.models)
      setMessage('Deleted.')
    } catch (err) { setError(err?.message || 'Delete failed.') } finally { setBusy(false) }
  }

  const allModels = [...AVATAR_CATALOG, ...remoteModels.filter((m) => !AVATAR_CATALOG.some((c) => c.id === m.id))]

  const isSpeaking = previewEmotion === 'speaking' || previewSpeaking
  const isThinking = previewEmotion === 'thinking'
  const isListening = previewEmotion === 'listening'

  const activeModelLabel = allModels.find((m) => m.id === (prefs?.modelId || activeModel?.id))?.label ?? activeModel?.id ?? 'Procedural'
  const activeRenderer = prefs?.renderer || 'auto'

  return (
    <div className={`avatar-studio ${controlsHidden ? 'is-controls-hidden' : ''} ${!inspectorOpen ? 'is-inspector-closed' : ''}`}>
      {/* ── Stage ── */}
      <div className="avatar-stage">
        {/* Floating top-left badge */}
        {!controlsHidden && <div className="avatar-studio-badge" aria-hidden="true">
          <span className="avatar-studio-badge-title">Avatar Studio</span>
          <span className="avatar-studio-badge-sep">·</span>
          <span className="avatar-studio-badge-model" title={activeModelLabel}>{activeModelLabel}</span>
          <span className="avatar-studio-badge-renderer">{activeRenderer}</span>
        </div>}

        {!controlsHidden && <div className="avatar-stage-toolbar">
          <span className="avatar-stage-eyebrow">Live preview</span>
          <button
            type="button"
            className="avatar-inspector-toggle"
            onClick={() => setInspectorOpen((open) => !open)}
            aria-expanded={inspectorOpen}
            aria-controls="avatar-inspector"
          >
            <PanelRight size={15} />
            {inspectorOpen ? 'Hide panel' : 'Show panel'}
          </button>
          <button type="button" className="avatar-hide-all" onClick={() => { setControlsHidden(true); setInspectorOpen(false) }} aria-label="Hide all controls" title="Hide all controls">
            <X size={15} />
          </button>
        </div>}

        {/* Floating status toast */}
        {(message || error) && (
          <div className={`avatar-status-toast ${error ? 'is-error' : 'is-success'}`} role={error ? 'alert' : 'status'}>
            {error || message}
          </div>
        )}

        {/* Avatar fills the full stage — auto-loads immediately */}
        <EveAvatar
          size="lg"
          className="avatar-studio-character"
          presetId={activePreset}
          prefs={prefs}
          activeModel={activeModel}
          isSending={isThinking || isSpeaking}
          isEveSpeaking={isSpeaking}
          isEveThinking={isThinking}
          thinkingText={isThinking ? 'Thinking…' : ''}
          activeTool={previewEmotion === 'tool' ? 'workspace_files' : null}
          streamText={isSpeaking ? "Hello! I'm Eve — your anime companion." : ''}
          sttRecording={isListening}
          sttStatus={isListening ? 'listening' : 'idle'}
          error={previewEmotion === 'error' ? 'Demo error state' : ''}
          resetViewSignal={viewResetKey}
          onTransformChange={handleTransformChange}
          onToggleRenderer={() => persist({ renderer: prefs?.renderer === 'vrm' ? 'live2d' : prefs?.renderer === 'live2d' ? 'auto' : 'vrm' })}
        />

        {!controlsHidden && <div className="avatar-camera-dock" aria-label="Camera controls">
          <div className="avatar-camera-dock-header">
            <div>
              <span className="avatar-camera-kicker">Camera</span>
              <strong>Frame your avatar</strong>
            </div>
            <span className="avatar-camera-value">{(prefs?.zoom ?? 1).toFixed(2)}×</span>
          </div>
          <div className="avatar-camera-controls">
            <button type="button" className="avatar-zoom-step" onClick={() => handleZoomStep(-ZOOM_STEP)} disabled={busy || (prefs?.zoom ?? 1) <= AVATAR_LIMITS.ZOOM_MIN} aria-label="Zoom out" title="Zoom out">
              <Minus size={15} />
            </button>
            <input
              className="avatar-zoom-input"
              type="range"
              min="0.3"
              max="3.0"
              step="0.05"
              value={prefs?.zoom ?? 1}
              onChange={(event) => persistZoom(Number(event.target.value))}
              disabled={busy}
              aria-label="Camera zoom"
            />
            <button type="button" className="avatar-zoom-step" onClick={() => handleZoomStep(ZOOM_STEP)} disabled={busy || (prefs?.zoom ?? 1) >= AVATAR_LIMITS.ZOOM_MAX} aria-label="Zoom in" title="Zoom in">
              <Plus size={15} />
            </button>
          </div>
          <small>Drag to pan · Scroll to zoom · Double-click to reset</small>
          <div className="avatar-camera-actions">
            <button type="button" className="btn-primary" onClick={handleSaveCameraPosition} disabled={busy}>
              <Save size={14} /> Save position
            </button>
            <button type="button" className="btn-ghost" onClick={handleResetView} disabled={busy}>
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>}

        {controlsHidden && (
          <button type="button" className="avatar-show-controls" onClick={() => { setControlsHidden(false); setInspectorOpen(true) }} aria-label="Show all controls">
            <PanelRight size={15} /> Show controls
          </button>
        )}

        {/* Floating emotion chips at bottom-center */}
        {!controlsHidden && <div className="avatar-emotion-bar" role="group" aria-label="Preview emotion">
          {EMOTIONS.map((emo) => (
            <button
              key={emo}
              type="button"
              className={`avatar-emotion-chip ${previewEmotion === emo ? 'is-active' : ''}`}
              onClick={() => { setPreviewEmotion(emo); setPreviewSpeaking(emo === 'speaking') }}
              aria-pressed={previewEmotion === emo}
            >
              {emo === 'idle' && <Heart size={12} />}
              {emo === 'listening' && <Mic size={12} />}
              {emo === 'thinking' && <TestTube size={12} />}
              {emo === 'speaking' && <Zap size={12} />}
              {emo === 'tool' && <Settings2 size={12} />}
              {emo === 'error' && <Trash2 size={12} />}
              {emo}
            </button>
          ))}
        </div>}
      </div>

      {/* ── HUD Panel — frosted glass, right edge ── */}
      <aside id="avatar-inspector" className={`avatar-inspector ${inspectorOpen && !controlsHidden ? 'is-open' : ''}`} aria-label="Avatar studio controls" aria-hidden={!inspectorOpen || controlsHidden}>
        <div className="avatar-inspector-header">
          <div>
            <span className="avatar-inspector-kicker">Studio controls</span>
            <h2>Customize Eve</h2>
          </div>
          <button type="button" className="avatar-inspector-close" onClick={() => setInspectorOpen(false)} aria-label="Hide studio controls">
            <X size={16} />
          </button>
        </div>

        {/* § Models (Primary Selector) */}
        <details className="avatar-inspector-section" open>
          <summary><GlassWater size={14} /> <span>Models</span><small>{allModels.length} available</small></summary>
          <div className="avatar-hud-section">
          {allModels.length === 0 && <EmptyState title="No models" description="Bundled models failed to load." />}
          <div className="avatar-hud-models-strip">
            {allModels.map((model) => {
              const active = (prefs?.modelId || activeModel?.id) === model.id
              const selectModel = () => persist({ modelId: model.id, modelUrl: model.url || null, renderer: model.renderer === 'live2d' ? 'live2d' : model.renderer === 'vrm' ? 'vrm' : undefined })
              return (
                <div key={model.id} className={`avatar-model-card ${active ? 'is-active' : ''}`}>
                  <button type="button" className="avatar-model-select" onClick={selectModel} disabled={busy} aria-pressed={active} aria-label={`Use ${model.label}`}>
                    <span className="avatar-model-thumb"><GlassWater size={16} /></span>
                    <span className="avatar-model-label" title={model.label}>{model.label}</span>
                    <small className="avatar-model-meta">{model.renderer}</small>
                  </button>
                  {model.id.startsWith('upload:') && (
                    <button type="button" className="avatar-model-delete" onClick={() => handleDelete(model.id)} disabled={busy} title={`Delete ${model.label}`}>
                      <Trash2 size={10} /> Del
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          </div>
        </details>

        {/* § Presence */}
        <details className="avatar-inspector-section" open>
          <summary><Eye size={14} /> <span>Presence</span><small>Visibility & access</small></summary>
          <div className="avatar-hud-section">
          <div className="avatar-hud-toggle-group">
            <label className="avatar-toggle">
              <input type="checkbox" checked={prefs?.enabled !== false} onChange={(e) => persist({ enabled: e.target.checked })} disabled={busy} />
              <Eye size={13} /> Enabled
            </label>
            {isTauri() && (
              <small className="avatar-hud-form-hint" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-success)' }}>
                <Monitor size={11} /> Floats above all apps
              </small>
            )}
            <label className="avatar-toggle">
              <input type="checkbox" checked={prefs?.inlineEnabled !== false} onChange={(e) => persist({ inlineEnabled: e.target.checked })} disabled={busy} />
              Inline on Eve
            </label>
            <label className="avatar-toggle">
              <input type="checkbox" checked={prefs?.docked !== false} onChange={(e) => persist({ docked: e.target.checked })} disabled={busy} />
              <Monitor size={13} /> Global dock
            </label>
          </div>

          {/* Overlay size — only shown on Tauri desktop */}
          {isTauri() && (
            <>
              <div className="avatar-hud-form-row" style={{ marginTop: 8 }}>
                <span className="avatar-hud-form-label">Overlay W</span>
                <div className="avatar-hud-slider-row">
                  <input
                    type="range" min="200" max="500" step="10"
                    value={prefs?.overlaySize?.w ?? AVATAR_DEFAULTS.overlaySize.w}
                    onChange={(e) => persistOverlaySize('w', Number(e.target.value))}
                    disabled={busy}
                    aria-label="Overlay window width"
                  />
                  <span className="avatar-hud-slider-value">{prefs?.overlaySize?.w ?? AVATAR_DEFAULTS.overlaySize.w}px</span>
                </div>
              </div>
              <div className="avatar-hud-form-row">
                <span className="avatar-hud-form-label">Overlay H</span>
                <div className="avatar-hud-slider-row">
                  <input
                    type="range" min="300" max="700" step="10"
                    value={prefs?.overlaySize?.h ?? AVATAR_DEFAULTS.overlaySize.h}
                    onChange={(e) => persistOverlaySize('h', Number(e.target.value))}
                    disabled={busy}
                    aria-label="Overlay window height"
                  />
                  <span className="avatar-hud-slider-value">{prefs?.overlaySize?.h ?? AVATAR_DEFAULTS.overlaySize.h}px</span>
                </div>
              </div>
            </>
          )}
          </div>
        </details>

        {/* § Appearance */}
        <details className="avatar-inspector-section" open>
          <summary><Sparkles size={14} /> <span>Avatar</span><small>Renderer & motion</small></summary>
          <div className="avatar-hud-section">

          <div className="avatar-hud-form-row">
            <span className="avatar-hud-form-label">Renderer</span>
            <CustomDropdown options={RENDERER_OPTIONS} value={prefs?.renderer || 'auto'} onChange={(v) => persist({ renderer: v })} placeholder="Auto" />
            <small className="avatar-hud-form-hint">Auto respects WebGL2 + memory + reduced-motion.</small>
          </div>

          <div className="avatar-hud-form-row">
            <span className="avatar-hud-form-label">Motion</span>
            <CustomDropdown options={MOTION_OPTIONS} value={prefs?.motion || 'auto'} onChange={(v) => persist({ motion: v })} placeholder="Auto" />
          </div>

          <div className="avatar-hud-form-row">
            <span className="avatar-hud-form-label">Scale</span>
            <div className="avatar-hud-slider-row">
              <input
                id="avatar-scale"
                className="avatar-scale-input"
                type="range" min="0.8" max="1.2" step="0.05"
                value={prefs?.scale ?? 1}
                onChange={(e) => persistScale(Number(e.target.value))}
                disabled={busy}
                aria-label="Avatar scale"
              />
              <span className="avatar-hud-slider-value">{(prefs?.scale ?? 1).toFixed(2)}×</span>
            </div>
          </div>

          <div className="avatar-hud-inline-row">
            <label className="avatar-toggle">
              <input type="checkbox" checked={prefs?.autoRotate === true} onChange={(e) => persist({ autoRotate: e.target.checked })} disabled={busy} />
              <Orbit size={13} /> Auto-rotate
            </label>
          </div>
          <small className="avatar-hud-gesture-hint">Drag to pan · Scroll to zoom · Double-click to reset</small>

          <div className="avatar-reset-layout-row">
            <button type="button" className="btn-ghost avatar-reset-layout" onClick={() => persist({ scale: 1, renderer: 'auto', motion: 'auto', position: { x: 92, y: 88 } })} disabled={busy}>
              <RotateCcw size={12} /> Reset layout
            </button>
          </div>
          </div>
        </details>

        {/* § Upload */}
        <details className="avatar-inspector-section">
          <summary><Upload size={14} /> <span>Upload</span><small>VRM, GLB, Live2D</small></summary>
          <div className="avatar-hud-section">
          <small className="avatar-hud-form-hint">.vrm / .glb / .model3.json / .zip — max 12MB</small>
          <div className="avatar-hud-inline-row avatar-upload-actions">
            <input ref={fileRef} className="avatar-file-input is-hidden" type="file" accept=".vrm,.glb,.gltf,.json,.zip,model3.json" onChange={handleUpload} disabled={busy} aria-label="Upload avatar model" />
            <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload size={14} /> Choose file
            </button>
            <span className="avatar-hud-form-hint"><Smartphone size={11} /> Mobile + Tauri supported.</span>
          </div>
          </div>
        </details>

        <div className="avatar-inspector-footer">
          <button type="button" className="btn-ghost avatar-reset-framing" onClick={handleResetFraming} disabled={busy}>
            <Frame size={13} /> Reset framing
          </button>
          <button type="button" className="btn-secondary avatar-settings-button" onClick={() => onNavigate?.('setting')} disabled={busy}>
            <Settings2 size={13} /> Open Settings
          </button>
        </div>
      </aside>
    </div>
  )
}
