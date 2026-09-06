export const SCENE_SCHEMA_VERSION = 1

export const TOOL_GROUPS = [
  { id: 'select', label: 'Select', icon: 'MousePointer2' },
  { id: 'move', label: 'Move', icon: 'Move3d' },
  { id: 'rotate', label: 'Rotate', icon: 'Rotate3d' },
  { id: 'scale', label: 'Scale', icon: 'Scaling' },
  { id: 'sculpt', label: 'Sculpt', icon: 'Brush' },
  { id: 'paint', label: 'Paint', icon: 'Paintbrush' },
  { id: 'rig', label: 'Rig', icon: 'Bone' },
]

export function createSceneProject(model = null) {
  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    model: model ? {
      id: model.id,
      label: model.label,
      renderer: model.renderer,
      url: model.url || null,
      assetId: null,
    } : null,
    nodes: [],
    materials: [],
    animations: [],
    camera: { position: [0, 1.2, 3.5], target: [0, 1, 0], zoom: 1 },
    settings: { grid: true, axes: true, background: 'theme' },
  }
}

export function normalizeSceneProject(scene, fallbackModel = null) {
  const base = createSceneProject(fallbackModel)
  if (!scene || typeof scene !== 'object') return base
  return {
    ...base,
    ...scene,
    schemaVersion: Number(scene.schemaVersion || SCENE_SCHEMA_VERSION),
    nodes: Array.isArray(scene.nodes) ? scene.nodes : [],
    materials: Array.isArray(scene.materials) ? scene.materials : [],
    animations: Array.isArray(scene.animations) ? scene.animations : [],
    camera: { ...base.camera, ...(scene.camera || {}) },
    settings: { ...base.settings, ...(scene.settings || {}) },
  }
}

export function cloneScene(scene) {
  return JSON.parse(JSON.stringify(scene))
}

export function updateNode(scene, nodeId, patch) {
  return {
    ...scene,
    nodes: scene.nodes.map((node) => node.id === nodeId ? { ...node, ...patch } : node),
  }
}

export function updateNodeTransform(scene, nodeId, field, value) {
  return updateNode(scene, nodeId, { [field]: value })
}

export function sceneNodeCount(scene) {
  return Array.isArray(scene?.nodes) ? scene.nodes.length : 0
}
