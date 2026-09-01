import { useEffect, useRef, useState } from 'react'
import { Bot, Eye, Upload, Trash2, Monitor, Smartphone, GlassWater, Sparkles } from 'lucide-react'
import { CustomDropdown } from '../../components/ui/CustomDropdown'
import { SettingsCard } from '../../components/ui/SettingsCard'
import { SettingsSection } from '../../components/ui/SettingsSection'
import { EveInlineAvatar } from '../../components/eve/avatar/EveInlineAvatar'
import { AVATAR_CATALOG, AVATAR_RENDERERS } from '../../components/eve/avatar/avatarConstants'
import { useEveAvatar } from '../../components/eve/avatar/EveAvatarProvider'
import { getAvatarPreferences, listAvatarModels, saveAvatarPreferences, uploadAvatarModel, deleteAvatarModel } from '../../lib/eveAvatarApi'
import { useThemeCustomizer } from '../../hooks/useThemeCustomizer'

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

export function EveAvatarSection() {
  const { prefs, setPrefs, activeModel } = useEveAvatar()
  const { activePreset } = useThemeCustomizer() || {}
  const activePresetId = activePreset
  const [remoteModels, setRemoteModels] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await getAvatarPreferences().catch(() => null)
        if (!cancelled && res?.preferences) {
          setPrefs(res.preferences)
        }
        const models = await listAvatarModels().catch(() => null)
        if (!cancelled && models?.models) setRemoteModels(models.models)
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [setPrefs])

  const persist = async (patch) => {
    setBusy(true)
    setError('')
    setMessage('')
    const next = { ...prefs, ...patch }
    setPrefs(next)
    try {
      const res = await saveAvatarPreferences(next)
      if (res?.preferences) setPrefs(res.preferences)
      setMessage('Avatar preferences saved.')
      setTimeout(() => setMessage(''), 2200)
    } catch (err) {
      setError(err?.message || 'Could not save preferences.')
    } finally {
      setBusy(false)
    }
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const ext = `.${file.name.split('.').pop().toLowerCase()}`
    const allowed = ['.vrm', '.glb', '.gltf', '.zip', '.json']
    if (!allowed.some((a) => ext === a || file.name.toLowerCase().endsWith('.model3.json'))) {
      setError(`Unsupported file type ${ext} — use .vrm, .glb, .model3.json or .zip`)
      event.target.value = ''
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('File too large — max 12MB.')
      event.target.value = ''
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await uploadAvatarModel(file)
      const pref = res?.preferences || res
      if (pref?.modelId) setPrefs((current) => ({ ...current, modelId: pref.modelId, modelUrl: pref.modelUrl || pref.url || null }))
      if (res?.preferences) setPrefs(res.preferences)
      const models = await listAvatarModels().catch(() => null)
      if (models?.models) setRemoteModels(models.models)
      setMessage(`Uploaded ${file.name} — validated.`)
      setTimeout(() => setMessage(''), 2500)
    } catch (err) {
      setError(err?.message || 'Upload failed — check file and try again.')
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  const handleDelete = async (modelId) => {
    if (!modelId?.startsWith('upload:')) return
    setBusy(true)
    setError('')
    try {
      await deleteAvatarModel(modelId)
      setPrefs((current) => ({ ...current, modelId: AVATAR_CATALOG[0].id, modelUrl: null }))
      const models = await listAvatarModels().catch(() => null)
      if (models?.models) setRemoteModels(models.models)
      setMessage('Uploaded model deleted.')
    } catch (err) {
      setError(err?.message || 'Could not delete model.')
    } finally { setBusy(false) }
  }

  const allModels = [...AVATAR_CATALOG, ...remoteModels.filter((m) => !AVATAR_CATALOG.some((c) => c.id === m.id))]

  return (
    <SettingsSection
      id="settings-eve-avatar"
      title="Eve Avatar (Live2D / 3D)"
      description="Global floating companion + inline avatar on Eve pages. Auto picks 3D VRM on desktop and Live2D on mobile, or choose manually. Upload your own .vrm / .glb / .model3.json (.zip)."
    >
      <SettingsCard
        icon={Bot}
        title="Avatar presence"
        description="Toggle everywhere vs inline only. Global dock is draggable — drag the header pill."
        actions={
          <label className=" eve-avatar-toggle">
            <input type="checkbox" checked={prefs?.enabled !== false} onChange={(e) => persist({ enabled: e.target.checked })} disabled={busy} />
            <span>{prefs?.enabled !== false ? 'Enabled' : 'Disabled'}</span>
          </label>
        }
      >
        <div className="eve-avatar-preview-grid">
          <EveInlineAvatar
            size="md"
            presetId={activePresetId}
            prefs={prefs}
            activeModel={activeModel}
            isEveSpeaking={false}
            isEveThinking={false}
          />
          <div className="eve-avatar-controls">
            <div className="form-row">
              <label className="form-label">Renderer</label>
              <CustomDropdown
                options={RENDERER_OPTIONS}
                value={prefs?.renderer || 'auto'}
                onChange={(val) => persist({ renderer: val })}
                placeholder="Auto"
              />
              <small className="form-hint">Auto uses WebGL2 + memory probe. Live2D lighter on Android.</small>
            </div>
            <div className="form-row">
              <label className="form-label">Motion</label>
              <CustomDropdown
                options={MOTION_OPTIONS}
                value={prefs?.motion || 'auto'}
                onChange={(val) => persist({ motion: val })}
                placeholder="Auto"
              />
              <small className="form-hint">Auto respects prefers-reduced-motion. Reduced disables mouth/eye follow.</small>
            </div>
            <div className="form-row form-row-inline">
              <label className="form-label">Scale</label>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={prefs?.scale ?? 1}
                onChange={(e) => persist({ scale: Number(e.target.value) })}
                disabled={busy}
                aria-label="Avatar scale"
              />
              <span className="form-value">{(prefs?.scale ?? 1).toFixed(2)}×</span>
            </div>
            <div className="form-row form-row-inline">
              <label className="checkbox-row">
                <input type="checkbox" checked={prefs?.inlineEnabled !== false} onChange={(e) => persist({ inlineEnabled: e.target.checked })} disabled={busy} />
                <Eye size={14} /> Inline on Eve pages
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={prefs?.docked !== false} onChange={(e) => persist({ docked: e.target.checked })} disabled={busy} />
                <Monitor size={14} /> Global dock
              </label>
            </div>
          </div>
        </div>
        {(message || error) && (
          <div className={`eve-avatar-banner ${error ? 'is-error' : 'is-success'}`} role={error ? 'alert' : 'status'}>
            {error || message}
          </div>
        )}
      </SettingsCard>

      <SettingsCard
        icon={Sparkles}
        title="Example models"
        description="Bundled CC0 examples. Pick one — auto applies renderer."
      >
        <div className="eve-avatar-model-grid">
          {allModels.map((model) => {
            const active = (prefs?.modelId || activeModel?.id) === model.id
            return (
              <button
                key={model.id}
                type="button"
                className={`eve-avatar-model-card ${active ? 'is-active' : ''}`}
                onClick={() => persist({ modelId: model.id, modelUrl: model.url || null, renderer: model.renderer === 'live2d' ? AVATAR_RENDERERS.LIVE2D : model.renderer === 'vrm' ? AVATAR_RENDERERS.VRM : undefined })}
                disabled={busy}
                aria-pressed={active}
              >
                <span className="eve-avatar-model-thumb" aria-hidden="true"><GlassWater size={18} /></span>
                <span className="eve-avatar-model-label">{model.label}</span>
                <small className="eve-avatar-model-meta">{model.renderer} • {model.id.startsWith('upload:') ? 'uploaded' : 'example'}</small>
                <small className="eve-avatar-model-attrib">{model.attribution}</small>
                {model.id.startsWith('upload:') ? (
                  <span className="eve-avatar-model-delete" onClick={(e) => { e.stopPropagation(); handleDelete(model.id) }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(model.id) }} title="Delete uploaded model">
                    <Trash2 size={12} /> Delete
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </SettingsCard>

      <SettingsCard
        icon={Upload}
        title="Upload model"
        description="Validate .vrm / .glb / .model3.json / .zip (max 12MB, zip must contain one model3.json). Stored per-user in workspace storage."
      >
        <div className="eve-avatar-upload-row">
          <input ref={fileRef} type="file" accept=".vrm,.glb,.gltf,.json,.zip,model3.json" onChange={handleUpload} disabled={busy} aria-label="Upload avatar model" />
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload size={14} /> Choose file
          </button>
          <span className="form-hint"><Smartphone size={12} /> Mobile + Tauri both support upload.</span>
        </div>
      </SettingsCard>
    </SettingsSection>
  )
}
