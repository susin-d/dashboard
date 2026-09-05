import "../styles/pages/avatar.css"
import { useEffect, useRef, useState } from 'react'
import { Bot, Eye, GlassWater, Heart, Mic, Monitor, Move, Orbit, RotateCcw, Settings2, Sparkles, TestTube, Upload, Trash2, Smartphone, Zap } from 'lucide-react'
import { PageHeader, EmptyState, CustomDropdown } from '../components/ui'
import { SettingsCard } from '../components/ui/SettingsCard'
import { EveAvatar } from '../components/eve/avatar/EveAvatar'
import { AVATAR_CATALOG, AVATAR_LIMITS } from '../components/eve/avatar/avatarConstants'
import { useEveAvatar } from '../components/eve/avatar/EveAvatarProvider'
import { getAvatarPreferences, listAvatarModels, saveAvatarPreferences, uploadAvatarModel, deleteAvatarModel } from '../lib/eveAvatarApi'
import { useThemeCustomizer } from '../hooks/useThemeCustomizer'

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

export function AvatarPage({ onNavigate }) {
  const { prefs, setPrefs, activeModel } = useEveAvatar()
  const { activePreset } = useThemeCustomizer() || {}
  const [remoteModels, setRemoteModels] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [previewEmotion, setPreviewEmotion] = useState('idle')
  const [previewSpeaking, setPreviewSpeaking] = useState(false)
  const [heavyPreview, setHeavyPreview] = useState(false)
  const [viewResetKey, setViewResetKey] = useState(0)
  const fileRef = useRef(null)
  const scaleSaveTimeoutRef = useRef(0)
  const zoomSaveTimeoutRef = useRef(0)

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
  }, [])

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

  const handleResetView = () => {
    setViewResetKey((key) => key + 1)
    persist({ zoom: 1 })
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const ext = `.${file.name.split('.').pop().toLowerCase()}`
    if (!['.vrm', '.glb', '.gltf', '.zip', '.json'].some((a) => ext === a || file.name.toLowerCase().endsWith('.model3.json'))) {
      setError(`Unsupported ${ext} — use .vrm, .glb, .model3.json or .zip`)
      event.target.value = ''; return
    }
    if (file.size > AVATAR_LIMITS.UPLOAD_MAX_BYTES) { setError('Max 12MB.'); event.target.value=''; return }
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
    } catch (err) { setError(err?.message || 'Upload failed.') } finally { setBusy(false); event.target.value='' }
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

  return (
    <div className="avatar-page">
      <PageHeader
        eyebrow="Eve AI"
        title="Avatar Studio"
        description="Live2D + 3D VRM — global floating companion + inline on Eve pages. Auto picks VRM on desktop and Live2D on mobile. Upload your own .vrm / .glb / .model3.json (.zip)."
        actions={
          <div className="avatar-page-actions">
            <button type="button" className="btn-secondary" onClick={() => onNavigate?.('setting')}><Settings2 size={14} /> Settings</button>
            <button type="button" className="btn-primary" onClick={() => { setPreviewEmotion('speaking'); setPreviewSpeaking(true); setTimeout(() => setPreviewSpeaking(false), 3200) }}><Zap size={14} /> Test speak</button>
          </div>
        }
      />

      {(message || error) && (
        <div className={`avatar-banner ${error ? 'is-error' : 'is-success'}`} role={error ? 'alert' : 'status'}>{error || message}</div>
      )}

      <div className="avatar-studio-grid">
        <div className="avatar-preview-card">
          <div className="avatar-preview-header">
            <span className="avatar-preview-title"><Bot size={14} /> Live preview</span>
            <span className={`avatar-preview-emotion is-${previewEmotion}`}>{previewEmotion}</span>
          </div>
          <div className="avatar-preview-stage">
            {heavyPreview ? (
              <EveAvatar
                size="lg"
                presetId={activePreset}
                prefs={prefs}
                activeModel={activeModel}
                isSending={isThinking || isSpeaking}
                isEveSpeaking={isSpeaking}
                isEveThinking={isThinking}
                thinkingText={isThinking ? 'Thinking…' : ''}
                activeTool={previewEmotion === 'tool' ? 'workspace_files' : null}
                streamText={isSpeaking ? 'Hello! I’m Eve — your anime companion.' : ''}
                sttRecording={isListening}
                sttStatus={isListening ? 'listening' : 'idle'}
                error={previewEmotion === 'error' ? 'Demo error state' : ''}
                resetViewSignal={viewResetKey}
                onToggleRenderer={() => persist({ renderer: prefs?.renderer === 'vrm' ? 'live2d' : prefs?.renderer === 'live2d' ? 'auto' : 'vrm' })}
              />
            ) : (
              <div className="avatar-preview-placeholder">
                <div className="avatar-preview-placeholder-card">
                  <GlassWater size={24} />
                  <p>3D preview is paused to save memory</p>
                  <small>Procedural avatar is active (0 bytes). Heavy 10MB VRM + 3MB Live2D textures can crash low-end PCs.</small>
                  <button type="button" className="btn-primary" onClick={() => setHeavyPreview(true)}><Zap size={14} /> Load 3D preview (heavy)</button>
                </div>
              </div>
            )}
            {heavyPreview && (
            <div className="avatar-preview-mouth-hint" data-speaking={isSpeaking ? 'true' : 'false'} style={{ '--mouth': isSpeaking ? '0.6' : '0' }} aria-hidden="true">
              <span className="avatar-mouth-bar" />
            </div>
            )}
          </div>
          <div className="avatar-emotion-row" role="group" aria-label="Preview emotion">
            {EMOTIONS.map((emo) => (
              <button key={emo} type="button" className={`avatar-emotion-chip ${previewEmotion === emo ? 'is-active' : ''}`} onClick={() => { setPreviewEmotion(emo); setPreviewSpeaking(emo === 'speaking') }} aria-pressed={previewEmotion === emo}>
                {emo === 'idle' && <Heart size={12} />}
                {emo === 'listening' && <Mic size={12} />}
                {emo === 'thinking' && <TestTube size={12} />}
                {emo === 'speaking' && <Zap size={12} />}
                {emo === 'tool' && <Settings2 size={12} />}
                {emo === 'error' && <Trash2 size={12} />}
                {emo}
              </button>
            ))}
          </div>
          <div className="avatar-preview-footer">
            <span className="avatar-meta"><Monitor size={12} /> Global companion draggable — drag header pill in app</span>
            <span className="avatar-meta"><Move size={12} /> Position {prefs?.position?.x?.toFixed(0) ?? 92},{prefs?.position?.y?.toFixed(0) ?? 88} • Scale {(prefs?.scale ?? 1).toFixed(2)}×</span>
          </div>
        </div>

        <div className="avatar-controls-stack">
          <SettingsCard icon={<Eye size={16} />} title="Presence" description="Toggle everywhere vs inline. Header pill is drag handle.">
            <div className="avatar-controls-grid">
              <label className="avatar-toggle"><input type="checkbox" checked={prefs?.enabled !== false} onChange={(e) => persist({ enabled: e.target.checked })} disabled={busy} /> <Eye size={14} /> Enabled</label>
              <label className="avatar-toggle"><input type="checkbox" checked={prefs?.inlineEnabled !== false} onChange={(e) => persist({ inlineEnabled: e.target.checked })} disabled={busy} /> Inline on Eve</label>
              <label className="avatar-toggle"><input type="checkbox" checked={prefs?.docked !== false} onChange={(e) => persist({ docked: e.target.checked })} disabled={busy} /> <Monitor size={14} /> Global dock</label>
            </div>
          </SettingsCard>

          <SettingsCard icon={<Sparkles size={16} />} title="Appearance" description="Renderer, motion, widget scale, camera and orbit.">
            <div className="avatar-form-grid">
              <div className="form-row">
                <label className="form-label">Renderer</label>
                <CustomDropdown options={RENDERER_OPTIONS} value={prefs?.renderer || 'auto'} onChange={(v) => persist({ renderer: v })} placeholder="Auto" />
                <small className="form-hint">VRM 3D on desktop, Live2D on mobile. Auto respects WebGL2 + memory + prefers-reduced-motion.</small>
              </div>
              <div className="form-row">
                <label className="form-label">Motion</label>
                <CustomDropdown options={MOTION_OPTIONS} value={prefs?.motion || 'auto'} onChange={(v) => persist({ motion: v })} placeholder="Auto" />
              </div>
              <div className="form-row">
                <label className="form-label" htmlFor="avatar-scale">Scale {(prefs?.scale ?? 1).toFixed(2)}×</label>
                <input id="avatar-scale" className="avatar-scale-input" type="range" min="0.8" max="1.2" step="0.05" value={prefs?.scale ?? 1} onChange={(e) => persistScale(Number(e.target.value))} disabled={busy} aria-label="Avatar scale" />
              </div>
              <div className="avatar-form-divider" aria-hidden="true" />
              <p className="avatar-form-subtitle">Camera & orbit</p>
              <div className="form-row">
                <label className="form-label" htmlFor="avatar-zoom">Zoom {(prefs?.zoom ?? 1).toFixed(2)}×</label>
                <input id="avatar-zoom" className="avatar-zoom-input" type="range" min="0.5" max="2" step="0.05" value={prefs?.zoom ?? 1} onChange={(e) => persistZoom(Number(e.target.value))} disabled={busy} aria-label="Model zoom" />
                <small className="form-hint">Moves the 3D camera closer; enlarges Live2D.</small>
              </div>
              <div className="form-row">
                <label className="avatar-toggle"><input type="checkbox" checked={prefs?.autoRotate === true} onChange={(e) => persist({ autoRotate: e.target.checked })} disabled={busy} /> <Orbit size={14} /> Auto-rotate turntable</label>
                <small className="form-hint">Slow orbit when idle (3D only, off with reduced motion). Drag the preview to rotate; Reset view straightens it.</small>
              </div>
              <div className="form-row">
                <button type="button" className="btn-secondary" onClick={handleResetView} disabled={busy}><RotateCcw size={14} /> Reset view</button>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard icon={<Upload size={16} />} title="Upload model" description=".vrm / .glb / .model3.json / .zip (max 12MB, zip must contain one model3.json). Per-user storage.">
            <div className="avatar-upload-row">
              <input ref={fileRef} className="avatar-file-input is-hidden" type="file" accept=".vrm,.glb,.gltf,.json,.zip,model3.json" onChange={handleUpload} disabled={busy} aria-label="Upload avatar model" />
              <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}><Upload size={14} /> Choose file</button>
              <span className="form-hint"><Smartphone size={12} /> Mobile + Tauri supported.</span>
            </div>
          </SettingsCard>

          <button type="button" className="btn-ghost" onClick={() => persist({ scale: 1, renderer: 'auto', motion: 'auto', position: { x: 92, y: 88 } })}><RotateCcw size={14} /> Reset layout</button>
        </div>
      </div>

      <SettingsCard icon={<GlassWater size={16} />} title="Model library" description="3 bundled defaults (Procedural + Eve Anime VRM 10MB + Haru Greeter Live2D 3MB). Uploaded models appear here with delete.">
        <div className="avatar-model-grid">
          {allModels.length === 0 && <EmptyState title="No models" description="Bundled models failed to load." />}
          {allModels.map((model) => {
            const active = (prefs?.modelId || activeModel?.id) === model.id
            const selectModel = () => persist({ modelId: model.id, modelUrl: model.url || null, renderer: model.renderer === 'live2d' ? 'live2d' : model.renderer === 'vrm' ? 'vrm' : undefined })
            return (
              <div key={model.id} className={`avatar-model-card ${active ? 'is-active' : ''}`}>
                <button type="button" className="avatar-model-select" onClick={selectModel} disabled={busy} aria-pressed={active} aria-label={`Use ${model.label}`}>
                  <span className="avatar-model-thumb"><GlassWater size={18} /></span>
                  <span className="avatar-model-label">{model.label}</span>
                  <small className="avatar-model-meta">{model.renderer} • {model.id.startsWith('upload:') ? 'uploaded' : 'bundled'}</small>
                  <small className="avatar-model-attrib">{model.attribution}</small>
                </button>
                {model.id.startsWith('upload:') && (
                  <button type="button" className="avatar-model-delete" onClick={() => handleDelete(model.id)} disabled={busy} title={`Delete ${model.label}`}><Trash2 size={12} /> Delete</button>
                )}
              </div>
            )
          })}
        </div>
      </SettingsCard>
    </div>
  )
}
