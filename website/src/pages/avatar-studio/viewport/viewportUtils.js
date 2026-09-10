import * as THREE from 'three'

export function toArray(vector) {
  return [Number(vector.x.toFixed(4)), Number(vector.y.toFixed(4)), Number(vector.z.toFixed(4))]
}

export function themeColor(name) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const color = new THREE.Color()
  if (value) color.setStyle(value)
  return color
}

export function createNodeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
}

export function formatFromSource(source) {
  if (source?.format) return String(source.format).toLowerCase()
  const name = source?.file?.name || source?.url || ''
  return String(name).toLowerCase().split('.').pop() || 'glb'
}

export function canvasForTexture(material) {
  const image = material?.map?.image
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(1024, Math.max(32, image?.width || 512))
  canvas.height = Math.min(1024, Math.max(32, image?.height || 512))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Texture painting is unavailable in this browser.')
  if (image) {
    try { context.drawImage(image, 0, 0, canvas.width, canvas.height) } catch { /* Cross-origin textures are reported as unavailable below. */ }
  } else {
    context.fillStyle = `#${material?.color?.getHexString?.() || 'ffffff'}`
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  return canvas
}

export function serializeNode(object) {
  const material = object.isMesh ? (Array.isArray(object.material) ? object.material[0] : object.material) : null
  return {
    id: object.userData.nodeId,
    name: object.name,
    type: object.type,
    visible: object.visible,
    position: toArray(object.position),
    rotation: toArray(object.rotation),
    scale: toArray(object.scale),
    parentId: object.parent?.userData?.nodeId || null,
    isMesh: Boolean(object.isMesh),
    hasUv: Boolean(object.isMesh && object.geometry?.getAttribute?.('uv')),
    hasTexture: Boolean(material?.map),
    materialColor: material?.color ? `#${material.color.getHexString()}` : null,
    metalness: material?.metalness ?? 0,
    roughness: material?.roughness ?? 0.5,
    opacity: material?.opacity ?? 1,
    textureDataUrl: object.userData.textureDataUrl || null,
    materialSlots: Array.isArray(object.material) ? object.material.map((item) => item?.name || 'Material') : material ? [material.name || 'Material'] : [],
  }
}

export function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => material?.dispose?.())
  })
}
