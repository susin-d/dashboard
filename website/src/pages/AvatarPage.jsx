import { useEffect, useRef, useState } from 'react'
import { Bot, Eye, GlassWater, Heart, Maximize2, Mic, Monitor, Move, RotateCcw, Settings2, Sparkles, TestTube, Upload, Trash2, Smartphone, Zap } from 'lucide-react'
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

export function AvatarPage({ onNavigate }) {
  const { prefs, setPrefs, activeModel } = useEveAvatar()
  const { activePreset } = useThemeCustomizer() || {}
  const [remoteModels, setRemoteModels] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [previewEmotion, setPreviewEmotion] = useState('idle')
  const [previewSpeaking, setPreviewSpeaking] = useState(false)
  const [mouthDemo, setMouthDemo] = useState(0)
  const fileRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await getAvatarPreferences().catch(() => null)
        if (!cancelled && res?.preferences) setPrefs(res.preferences)
        const models = await listAvatarModels().catch(() => null)
        if (!cancelled && models?.models) setRemoteModels(models.models)
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [setPrefs])

  // lip-sync demo pulse when speaking
  useEffect(() => {
    if (!previewSpeaking) { setMouthDemo(0); return }
    let raf = 0
    const tick = () => {
      setMouthDemo(0.22 + Math.abs(Math.sin(Date.now() * 0.009)) * 0.55)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [previewSpeaking])

  const persist = async (patch) => {
    setBusy(true)
    setError(''); setMessage('')
    const next = { ...prefs, ...patch }
    setPrefs(next)
    try {
      const res = await saveAvatarPreferences(next)
      if (res?.preferences) setPrefs(res.preferences)
      setMessage('Saved.')
      window.setTimeout(() => setMessage(''), 1800)
    } catch (err) {
      setError(err?.message || 'Could not save.')
    } finally { setBusy(false) }
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
      window.setTimeout(() => setMessage(''), 2200)
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
              onToggleRenderer={() => persist({ renderer: prefs?.renderer === 'vrm' ? 'live2d' : prefs?.renderer === 'live2d' ? 'auto' : 'vrm' })}
            />
            {/* mouth demo drives lip-sync via streamText + isSpeaking; overlay mouth vis */}
            <div className="avatar-preview-mouth-hint" style={{ opacity: isSpeaking ? 1 : 0 }} aria-hidden="true">
              <span className="avatar-mouth-bar" style={{ width: `${Math.round(mouthDemo * 100)}%` }} />
            </div>
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
          <SettingsCard icon={Eye} title="Presence" description="Toggle everywhere vs inline. Header pill is drag handle.">
            <div className="avatar-controls-grid">
              <label className="avatar-toggle"><input type="checkbox" checked={prefs?.enabled !== false} onChange={(e) => persist({ enabled: e.target.checked })} disabled={busy} /> <Eye size={14} /> Enabled</label>
              <label className="avatar-toggle"><input type="checkbox" checked={prefs?.inlineEnabled !== false} onChange={(e) => persist({ inlineEnabled: e.target.checked })} disabled={busy} /> Inline on Eve</label>
              <label className="avatar-toggle"><input type="checkbox" checked={prefs?.docked !== false} onChange={(e) => persist({ docked: e.target.checked })} disabled={busy} /> <Monitor size={14} /> Global dock</label>
            </div>
          </SettingsCard>

          <SettingsCard icon={Sparkles} title="Appearance" description="Auto respects WebGL2 + memory + prefers-reduced-motion.">
            <div className="avatar-form-grid">
              <div className="form-row">
                <label className="form-label">Renderer</label>
                <CustomDropdown options={RENDERER_OPTIONS} value={prefs?.renderer || 'auto'} onChange={(v) => persist({ renderer: v })} placeholder="Auto" />
                <small className="form-hint">VRM 3D on desktop, Live2D on mobile.</small>
              </div>
              <div className="form-row">
                <label className="form-label">Motion</label>
                <CustomDropdown options={MOTION_OPTIONS} value={prefs?.motion || 'auto'} onChange={(v) => persist({ motion: v })} placeholder="Auto" />
              </div>
              <div className="form-row">
                <label className="form-label">Scale {(prefs?.scale ?? 1).toFixed(2)}×</label>
                <input type="range" min="0.8" max="1.2" step="0.05" value={prefs?.scale ?? 1} onChange={(e) => persist({ scale: Number(e.target.value) })} disabled={busy} aria-label="Avatar scale" />
              </div>
            </div>
          </SettingsCard>

          <SettingsCard icon={Upload} title="Upload model" description=".vrm / .glb / .model3.json / .zip (max 12MB, zip must contain one model3.json). Per-user storage.">
            <div className="avatar-upload-row">
              <input ref={fileRef} type="file" accept=".vrm,.glb,.gltf,.json,.zip,model3.json" onChange={handleUpload} disabled={busy} aria-label="Upload avatar model" style={{ display: 'none' }} />
              <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}><Upload size={14} /> Choose file</button>
              <span className="form-hint"><Smartphone size={12} /> Mobile + Tauri supported.</span>
            </div>
          </SettingsCard>

          <button type="button" className="btn-ghost" onClick={() => persist({ scale: 1, renderer: 'auto', motion: 'auto', position: { x: 92, y: 88 } })}><RotateCcw size={14} /> Reset layout</button>
        </div>
      </div>

      <SettingsCard icon={GlassWater} title="Model library" description="6 bundled anime defaults (3× VRM 10MB + Haru Greeter 3MB). Uploaded models appear here with delete.">
        <div className="avatar-model-grid">
          {allModels.length === 0 && <EmptyState title="No models" description="Bundled models failed to load." />}
          {allModels.map((model) => {
            const active = (prefs?.modelId || activeModel?.id) === model.id
            return (
              <button key={model.id} type="button" className={`avatar-model-card ${active ? 'is-active' : ''}`} onClick={() => persist({ modelId: model.id, modelUrl: model.url || null, renderer: model.renderer === 'live2d' ? 'live2d' : model.renderer === 'vrm' ? 'vrm' : undefined })} disabled={busy} aria-pressed={active}>
                <span className="avatar-model-thumb"><GlassWater size={18} /></span>
                <span className="avatar-model-label">{model.label}</span>
                <small className="avatar-model-meta">{model.renderer} • {model.id.startsWith('upload:') ? 'uploaded' : 'bundled'}</small>
                <small className="avatar-model-attrib">{model.attribution}</small>
                {model.id.startsWith('upload:') && (
                  <span className="avatar-model-delete" onClick={(e) => { e.stopPropagation(); handleDelete(model.id) }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(model.id) }} title="Delete"><Trash2 size={12} /> Delete</span>
                )}
              </button>
            )
          })}
        </div>
      </SettingsCard>

      <SettingsCard icon={Maximize2} title="How it works" description="Auto theme + lip-sync.">
        <ul className="avatar-help-list">
          <li><strong>Auto renderer:</strong> probes WebGL2 + `navigator.deviceMemory` + url ext; 8s timeout → orb fallback (never blank).</li>
          <li><strong>Auto tint:</strong> `avatarTokens` maps 25 presets — mono keeps monochrome, duo/spectrum accent → `var(--color-primary)` one hue (ADR 0011).</li>
          <li><strong>Lip-sync:</strong> `Web Audio AnalyserNode` (32 FFT, `aa/oh`, smooth 0.4) or viseme pulse; barge-in clears mouth.</li>
          <li><strong>Eye & blink:</strong> `pointermove` lerp + 3–6s blink via `ParamEyeLOpen/R` / VRM `blink`.</li>
          <li><strong>Positions:</strong> global dock header drag → <code>position {'{x,y}'}</code> clamped 0–100 + <code>BroadcastChannel</code> across tabs.</li>
        </ul>
      </SettingsCard>
    </div>
  )
}
