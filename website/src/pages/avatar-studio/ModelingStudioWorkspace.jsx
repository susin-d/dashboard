import '../../styles/pages/avatar-modeling.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Camera, ChevronLeft, ChevronRight, Eye, Grid3x3, Maximize2, PanelLeft, PanelRight, RotateCcw, Save, Sparkles, X } from 'lucide-react'
import { EveAvatar } from '../../components/eve/avatar/EveAvatar'
import { AVATAR_CATALOG, AVATAR_DEFAULTS, clampUserPan, clampZoom } from '../../components/eve/avatar/avatarConstants'
import { useEveAvatar } from '../../components/eve/avatar/EveAvatarProvider'
import { listAvatarModels, saveAvatarPreferences } from '../../lib/eveAvatarApi'
import { StudioModelBrowser } from './StudioModelBrowser'
import { StudioOutliner } from './StudioOutliner'
import { StudioProperties } from './StudioProperties'
import { SceneViewport } from './SceneViewport'
import { StudioTimeline } from './StudioTimeline'
import { StudioTopBar } from './StudioTopBar'
import { TOOL_GROUPS, createSceneProject, updateNode } from './sceneModel'
import { useModelingProject } from './useModelingProject'

const TOOL_ICONS = { MousePointer2: Sparkles, Move3d: Maximize2, Rotate3d: RotateCcw, Scaling: Maximize2, Brush: Sparkles, Paintbrush: Sparkles, Bone: Box }

function isTauri() {
  try { return typeof window !== 'undefined' && !!window.__TAURI__ } catch { return false }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ModelingStudioWorkspace() {
  const { prefs, setPrefs, activeModel } = useEveAvatar()
  const [remoteModels, setRemoteModels] = useState([])
  const [activeTool, setActiveTool] = useState('select')
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [nodes, setNodes] = useState([])
  const [source, setSource] = useState(null)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [browserOpen, setBrowserOpen] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [showAxes, setShowAxes] = useState(true)
  const [resetSignal, setResetSignal] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [materialPatch, setMaterialPatch] = useState(null)
  const viewportRef = useRef(null)
  const historyRef = useRef({ past: [], future: [] })
  const { projects, currentProject, scene, setScene, openProject, saveProject, importAsset, error: projectError } = useModelingProject(activeModel)

  useEffect(() => {
    listAvatarModels().then((result) => setRemoteModels(result?.models || [])).catch(() => {})
  }, [])

  const models = useMemo(() => [...AVATAR_CATALOG, ...remoteModels.filter((model) => !AVATAR_CATALOG.some((catalog) => catalog.id === model.id))], [remoteModels])
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null
  const isLive2D = (prefs?.renderer === 'live2d' || (prefs?.renderer === 'auto' && activeModel?.renderer === 'live2d')) && !source?.file

  useEffect(() => {
    if (source) return
    const model = models.find((item) => item.id === (prefs?.modelId || activeModel?.id)) || activeModel || models[0]
    if (model?.renderer === 'vrm' && model.url) setSource({ url: model.url, key: model.id })
  }, [activeModel, models, prefs?.modelId, source])

  useEffect(() => {
    if (projectError) setError(projectError)
  }, [projectError])

  const updateScene = useCallback((updater) => {
    setScene((current) => {
      historyRef.current.past.push(current)
      historyRef.current.future = []
      return typeof updater === 'function' ? updater(current) : updater
    })
  }, [setScene])

  const handleSelectModel = useCallback(async (model) => {
    setError('')
    const nextPrefs = { ...prefs, modelId: model.id, modelUrl: model.url || null, renderer: model.renderer === 'live2d' ? 'live2d' : 'vrm' }
    setPrefs(nextPrefs)
    await saveAvatarPreferences(nextPrefs).catch(() => {})
    updateScene((current) => ({ ...current, model: { id: model.id, label: model.label, renderer: model.renderer, url: model.url || null, assetId: null } }))
    setSource(model.renderer === 'vrm' && model.url ? { url: model.url, key: model.id } : null)
    setNodes([])
    setSelectedNodeId(null)
  }, [prefs, setPrefs, updateScene])

  const handleImport = useCallback(async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    const modelFile = files.find((file) => /\.(vrm|glb|gltf)$/i.test(file.name))
    if (!modelFile) { setError('Choose a VRM, GLB, or GLTF file.'); return }
    try {
      const uploaded = currentProject.id ? await importAsset(modelFile, { relativePath: modelFile.webkitRelativePath || modelFile.name }) : null
      setSource({ file: modelFile, files, key: `${modelFile.name}:${modelFile.lastModified}` })
      updateScene((current) => ({ ...current, model: { id: uploaded?.id || `local:${modelFile.name}`, label: modelFile.name, renderer: 'vrm', url: null, assetId: uploaded?.id || null } }))
      setStatus(`Loaded ${modelFile.name}`)
    } catch (err) {
      setError(err?.message || 'Could not import model.')
    }
  }, [currentProject.id, importAsset, updateScene])

  const handleSceneGraph = useCallback((nextNodes) => {
    setNodes(nextNodes)
    updateScene((current) => ({ ...current, nodes: nextNodes }))
  }, [updateScene])

  const handleNodeTransform = useCallback((nodeId, patch) => {
    setNodes((current) => current.map((node) => node.id === nodeId ? { ...node, ...patch } : node))
    updateScene((current) => updateNode(current, nodeId, patch))
  }, [updateScene])

  const handleNodeUpdate = useCallback((patch) => {
    if (!selectedNodeId) return
    setNodes((current) => current.map((node) => node.id === selectedNodeId ? { ...node, ...patch } : node))
    updateScene((current) => updateNode(current, selectedNodeId, patch))
  }, [selectedNodeId, updateScene])

  const handleNodeUpdateFor = useCallback((nodeId, patch) => {
    setNodes((current) => current.map((node) => node.id === nodeId ? { ...node, ...patch } : node))
    updateScene((current) => updateNode(current, nodeId, patch))
  }, [updateScene])

  const handleCameraChange = useCallback((camera) => {
    updateScene((current) => ({ ...current, camera: { ...current.camera, ...camera } }))
  }, [updateScene])

  const handleSave = useCallback(async () => {
    setError('')
    try {
      await saveProject('Save scene and camera')
      const nextPrefs = { ...prefs, userPan: clampUserPan(prefs?.userPan || AVATAR_DEFAULTS.userPan), zoom: clampZoom(prefs?.zoom || AVATAR_DEFAULTS.zoom) }
      await saveAvatarPreferences(nextPrefs).catch(() => {})
      setStatus('Project saved')
    } catch (err) {
      setError(err?.message || 'Could not save project.')
    }
  }, [prefs, saveProject])

  const handleExport = useCallback(async (format) => {
    setError('')
    if (format === 'vrm') { setError('VRM export requires a VRM-preserving scene. Use GLB for this scene.'); return }
    try {
      const result = await viewportRef.current?.exportScene(format)
      if (!result) throw new Error('Load a 3D model before exporting.')
      downloadBlob(result.blob, result.filename)
      setStatus(`Exported ${result.filename}`)
    } catch (err) {
      setError(err?.message || 'Could not export scene.')
    }
  }, [])

  const handleUndo = () => {
    const previous = historyRef.current.past.pop()
    if (!previous) return
    historyRef.current.future.push(scene)
    setScene(previous)
    setNodes(previous.nodes || [])
  }

  const handleRedo = () => {
    const next = historyRef.current.future.pop()
    if (!next) return
    historyRef.current.past.push(scene)
    setScene(next)
    setNodes(next.nodes || [])
  }

  const handleAddKeyframe = () => {
    if (!selectedNodeId) { setError('Select an object before adding a keyframe.'); return }
    updateScene((current) => ({ ...current, animations: [...(current.animations || []), { id: `${selectedNodeId}:${currentFrame}`, name: `${selectedNode?.name || 'Object'} frame ${currentFrame}`, frame: currentFrame, nodeId: selectedNodeId, transform: { position: selectedNode?.position, rotation: selectedNode?.rotation, scale: selectedNode?.scale } }] }))
    setStatus(`Keyframe added at ${currentFrame}`)
  }

  const handleResetCamera = () => { setResetSignal((value) => value + 1); updateScene((current) => ({ ...current, camera: createSceneProject().camera })) }
  const viewportSource = useMemo(() => source || (scene.model?.url ? { url: scene.model.url, key: scene.model.id } : null), [scene.model, source])

  return <div className={`modeling-studio ${inspectorOpen ? 'is-inspector-open' : ''} ${browserOpen ? 'is-browser-open' : ''}`}>
    <StudioTopBar project={currentProject} projects={projects} onOpen={(id) => id && openProject(id)} onSave={handleSave} onImport={handleImport} onExport={handleExport} onUndo={handleUndo} onRedo={handleRedo} canUndo={historyRef.current.past.length > 0} canRedo={historyRef.current.future.length > 0} />
    <div className="modeling-workspace">
      <aside className="modeling-tool-rail" aria-label="Modeling tools">
        <div className="modeling-tool-rail-brand">A</div>
        {TOOL_GROUPS.map((toolItem) => { const Icon = TOOL_ICONS[toolItem.icon] || Box; return <button type="button" key={toolItem.id} className={activeTool === toolItem.id ? 'is-active' : ''} onClick={() => setActiveTool(toolItem.id)} aria-pressed={activeTool === toolItem.id} title={toolItem.label}><Icon size={17} /><span>{toolItem.label}</span></button> })}
        <button type="button" className="modeling-tool-rail-bottom" onClick={() => setBrowserOpen((open) => !open)} aria-label="Toggle model browser"><PanelLeft size={17} /></button>
      </aside>
      {browserOpen && <StudioModelBrowser models={models} activeModelId={prefs?.modelId || activeModel?.id} onSelectModel={handleSelectModel} onImport={handleImport} />}
      <main className="modeling-center-column">
        <div className="modeling-viewport-shell">
          <div className="modeling-viewport-header"><div><span className="modeling-panel-kicker">3D Viewport</span><strong>Perspective</strong></div><div className="modeling-viewport-actions"><button type="button" onClick={() => setShowGrid((value) => !value)} className={showGrid ? 'is-active' : ''} aria-pressed={showGrid}><Grid3x3 size={14} /> Grid</button><button type="button" onClick={() => setShowAxes((value) => !value)} className={showAxes ? 'is-active' : ''} aria-pressed={showAxes}><Eye size={14} /> Axes</button><button type="button" onClick={() => setInspectorOpen((open) => !open)} aria-expanded={inspectorOpen}><PanelRight size={14} /></button></div></div>
          <div className="modeling-viewport-content">
            {isLive2D ? <EveAvatar size="lg" className="modeling-live2d-avatar" prefs={prefs} activeModel={activeModel} /> : <SceneViewport ref={viewportRef} source={viewportSource} selectedNodeId={selectedNodeId} tool={activeTool} showGrid={showGrid} showAxes={showAxes} resetSignal={resetSignal} onSceneGraph={handleSceneGraph} onSelectNode={setSelectedNodeId} onNodeTransform={handleNodeTransform} onMaterialChange={materialPatch} onCameraChange={handleCameraChange} onStatus={(next) => { if (next === 'error') setError('Could not load this model.') }} />}
            <div className="modeling-viewport-hint"><Camera size={13} /> Drag to orbit · Wheel to zoom · {activeTool === 'select' ? 'Click to select' : `${activeTool} tool active`}</div>
            <button type="button" className="modeling-fullscreen-button" aria-label="Fullscreen viewport"><Maximize2 size={15} /></button>
          </div>
        </div>
        <StudioTimeline nodes={nodes} scene={scene} playing={playing} currentFrame={currentFrame} onTogglePlayback={() => setPlaying((value) => !value)} onFrameChange={setCurrentFrame} onAddKeyframe={handleAddKeyframe} />
      </main>
      {inspectorOpen && <aside className="modeling-right-column"><StudioOutliner nodes={nodes} selectedNodeId={selectedNodeId} onSelect={setSelectedNodeId} onToggleVisibility={(node) => handleNodeUpdateFor(node.id, { visible: node.visible === false })} /><StudioProperties node={selectedNode} onUpdateNode={handleNodeUpdate} onMaterialChange={(patch) => setMaterialPatch(patch)} /><div className="modeling-render-card"><div><span className="modeling-panel-kicker">Render preview</span><strong>{scene.model?.label || 'No model loaded'}</strong></div><button type="button" onClick={() => handleExport('glb')}><Save size={14} /> Export GLB</button></div></aside>}
    </div>
    <div className="modeling-bottom-status"><span className={status ? 'is-success' : ''}>{status || (currentProject.dirty ? 'Unsaved changes' : 'Ready')}</span><span>{nodes.length} scene objects · {isTauri() ? 'Desktop' : 'Browser'} mode</span><button type="button" onClick={handleResetCamera}><RotateCcw size={13} /> Reset camera</button><button type="button" onClick={() => setInspectorOpen((open) => !open)}>{inspectorOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />} {inspectorOpen ? 'Hide inspector' : 'Show inspector'}</button></div>
    {(error || projectError) && <div className="modeling-toast is-error" role="alert"><X size={15} /> {error || projectError}</div>}
  </div>
}
