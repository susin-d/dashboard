import { forwardRef, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { canvasForTexture, themeColor, toArray } from './viewport/viewportUtils'
import { useModelLoader } from './viewport/useModelLoader'
import { useViewportActions } from './viewport/useViewportActions'

export const SceneViewport = forwardRef(function SceneViewport({ source, nodes = [], camera: savedCamera = null, selectedNodeId, tool, showGrid = true, showAxes = true, animationFrame = 0, activeAnimationId = null, playing = false, paintSettings = null, onSceneGraph, onSelectNode, onNodeTransform, onMaterialChange, onTextureChange, onCameraChange, onAnimationClips, resetSignal, onStatus }, ref) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const controlsRef = useRef(null)
  const transformRef = useRef(null)
  const rootRef = useRef(null)
  const nodeMapRef = useRef(new Map())
  const nodesRef = useRef(nodes)
  const selectedNodeIdRef = useRef(selectedNodeId)
  const toolRef = useRef(tool)
  const paintSettingsRef = useRef(paintSettings)
  const textureChangeRef = useRef(onTextureChange)
  const animationClipsRef = useRef(onAnimationClips)
  const statusRef = useRef(onStatus)
  const savedCameraRef = useRef(savedCamera)
  const selectedMaterialsRef = useRef(new Map())
  const mixerRef = useRef(null)
  const clipsRef = useRef([])
  const paintStateRef = useRef({ active: false, object: null, material: null, canvas: null, context: null })

  nodesRef.current = nodes
  savedCameraRef.current = savedCamera
  selectedNodeIdRef.current = selectedNodeId
  toolRef.current = tool
  paintSettingsRef.current = paintSettings
  textureChangeRef.current = onTextureChange
  animationClipsRef.current = onAnimationClips
  statusRef.current = onStatus

  useViewportActions(ref, { sceneRef, rootRef, nodeMapRef, mixerRef, clipsRef, activeAnimationId, onSceneGraph, onSelectNode })
  useModelLoader({ source, sceneRef, rootRef, nodeMapRef, cameraRef, controlsRef, mixerRef, clipsRef, nodesRef, savedCameraRef, statusRef, onAnimationClips, onSceneGraph })

  useEffect(() => {
    nodes.forEach((node) => {
      const object = nodeMapRef.current.get(node.id)
      if (!object) return
      object.visible = node.visible !== false
      if (Array.isArray(node.position)) object.position.set(...node.position)
      if (Array.isArray(node.rotation)) object.rotation.set(...node.rotation)
      if (Array.isArray(node.scale)) object.scale.set(...node.scale)
      if (node.textureDataUrl && object.isMesh) {
        const material = Array.isArray(object.material) ? object.material[0] : object.material
        const image = new Image()
        image.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          canvas.getContext('2d')?.drawImage(image, 0, 0)
          const texture = new THREE.CanvasTexture(canvas)
          if (material) {
            material.map?.dispose?.()
            material.map = texture
            material.needsUpdate = true
          }
        }
        image.src = node.textureDataUrl
      }
    })
  }, [nodes])

  useEffect(() => {
    const mixer = mixerRef.current
    if (!mixer || !clipsRef.current.length) return
    const clip = clipsRef.current.find((item) => item.uuid === activeAnimationId || item.name === activeAnimationId) || clipsRef.current[0]
    if (!clip) return
    mixer.stopAllAction()
    const action = mixer.clipAction(clip)
    action.reset()
    action.play()
    action.paused = !playing
    mixer.setTime(Math.max(0, Number(animationFrame)) / Math.max(1, Number(clip.userData?.fps || 24)))
  }, [activeAnimationId, animationFrame, playing])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined
    const editorScene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000)
    camera.position.set(0, 1.3, 3.5)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)

    const grid = new THREE.GridHelper(12, 24, themeColor('--color-primary'), themeColor('--border-heavy'))
    grid.position.y = 0
    grid.name = 'Studio grid'
    editorScene.add(grid)
    const axes = new THREE.AxesHelper(1.5)
    axes.name = 'Studio axes'
    editorScene.add(axes)
    editorScene.add(new THREE.HemisphereLight(themeColor('--text-primary'), themeColor('--border-color'), 2.4))
    const keyLight = new THREE.DirectionalLight(themeColor('--text-primary'), 3)
    keyLight.position.set(3, 5, 4)
    keyLight.castShadow = true
    editorScene.add(keyLight)
    const fillLight = new THREE.PointLight(themeColor('--color-accent'), 2, 10)
    fillLight.position.set(-3, 2, 2)
    editorScene.add(fillLight)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(0, 1, 0)
    const reportCameraChange = () => onCameraChange?.({ position: toArray(camera.position), target: toArray(controls.target) })
    controls.addEventListener('end', reportCameraChange)
    const transform = new TransformControls(camera, renderer.domElement)
    transform.addEventListener('dragging-changed', (event) => { controls.enabled = !event.value })
    transform.addEventListener('objectChange', () => {
      const object = transform.object
      if (!object?.userData?.nodeId) return
      onNodeTransform?.(object.userData.nodeId, {
        position: toArray(object.position),
        rotation: toArray(object.rotation),
        scale: toArray(object.scale),
      })
    })
    editorScene.add(transform)
    sceneRef.current = editorScene
    cameraRef.current = camera
    rendererRef.current = renderer
    controlsRef.current = controls
    transformRef.current = transform

    const resize = () => {
      const width = Math.max(1, container.clientWidth)
      const height = Math.max(1, container.clientHeight)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()
    let frame = 0
    const animate = () => {
      controls.update()
      renderer.render(editorScene, camera)
      frame = requestAnimationFrame(animate)
    }
    animate()

    const raycast = (event) => {
      const bounds = renderer.domElement.getBoundingClientRect()
      const pointer = new THREE.Vector2(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1)
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(pointer, camera)
      return raycaster.intersectObjects(rootRef.current ? [rootRef.current] : [], true)
    }
    const paintAt = (event) => {
      const hit = raycast(event).find((item) => item.object.isMesh && item.uv)
      if (!hit) {
        statusRef.current?.('Texture painting requires a selectable mesh with UVs.')
        return false
      }
      const object = hit.object
      const material = Array.isArray(object.material) ? object.material[hit.face?.materialIndex || 0] : object.material
      if (!material || !object.geometry?.getAttribute?.('uv')) {
        statusRef.current?.('This mesh does not expose paintable UV coordinates.')
        return false
      }
      let canvas = object.userData.paintCanvas
      if (!canvas) {
        try { canvas = canvasForTexture(material) } catch (error) {
          statusRef.current?.(error?.message || 'Texture painting is unavailable.')
          return false
        }
        object.userData.paintCanvas = canvas
      }
      const context = canvas.getContext('2d')
      if (!context) return false
      const settings = paintSettingsRef.current || {}
      const x = hit.uv.x * canvas.width
      const y = (1 - hit.uv.y) * canvas.height
      const radius = Math.max(1, (Number(settings.size || 24) / 100) * Math.min(canvas.width, canvas.height))
      context.save()
      context.globalAlpha = Math.max(0.01, Math.min(1, Number(settings.strength ?? 1)))
      context.globalCompositeOperation = settings.mode === 'erase' ? 'destination-out' : 'source-over'
      context.fillStyle = settings.color || '#a83b59'
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fill()
      context.restore()
      const texture = material.map || new THREE.CanvasTexture(canvas)
      texture.image = canvas
      texture.needsUpdate = true
      material.map = texture
      material.needsUpdate = true
      const textureDataUrl = canvas.toDataURL('image/png')
      object.userData.textureDataUrl = textureDataUrl
      textureChangeRef.current?.({ nodeId: object.userData.nodeId, textureDataUrl })
      return true
    }
    const pointerDown = (event) => {
      if (transform.dragging) return
      if (toolRef.current === 'paint') {
        paintStateRef.current.active = paintAt(event)
        if (paintStateRef.current.active) renderer.domElement.setPointerCapture?.(event.pointerId)
        return
      }
      if (toolRef.current !== 'select') return
      const hit = raycast(event).find((item) => item.object.userData.nodeId)
      onSelectNode?.(hit?.object?.userData?.nodeId || null)
    }
    const pointerMove = (event) => {
      if (paintStateRef.current.active && toolRef.current === 'paint') paintAt(event)
    }
    const pointerUp = (event) => {
      paintStateRef.current.active = false
      renderer.domElement.releasePointerCapture?.(event.pointerId)
    }
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointermove', pointerMove)
    renderer.domElement.addEventListener('pointerup', pointerUp)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      transform.dispose()
      controls.removeEventListener('end', reportCameraChange)
      controls.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [onCameraChange, onNodeTransform, onSelectNode])

  useEffect(() => {
    const transform = transformRef.current
    const object = nodeMapRef.current.get(selectedNodeId)
    if (!transform) return
    if (!object || tool === 'select' || tool === 'sculpt' || tool === 'paint' || tool === 'rig') {
      transform.detach()
      return
    }
    transform.setMode(tool === 'rotate' ? 'rotate' : tool === 'scale' ? 'scale' : 'translate')
    transform.attach(object)
  }, [selectedNodeId, tool])

  useEffect(() => {
    const grid = sceneRef.current?.getObjectByName('Studio grid')
    const axes = sceneRef.current?.getObjectByName('Studio axes')
    if (grid) grid.visible = showGrid
    if (axes) axes.visible = showAxes
  }, [showAxes, showGrid])

  useEffect(() => {
    if (!resetSignal || !cameraRef.current || !controlsRef.current) return
    cameraRef.current.position.set(0, 1.3, 3.5)
    controlsRef.current.target.set(0, 1, 0)
    controlsRef.current.update()
  }, [resetSignal])

  useEffect(() => {
    selectedMaterialsRef.current.forEach((color, material) => material.emissive?.copy(color))
    selectedMaterialsRef.current.clear()
    const root = rootRef.current
    if (!root || !selectedNodeId) return
    const object = nodeMapRef.current.get(selectedNodeId)
    if (object) object.traverse((child) => {
      if (!child.isMesh) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => {
        if (!material?.emissive) return
        selectedMaterialsRef.current.set(material, material.emissive.clone())
        material.emissive.copy(themeColor('--color-primary'))
      })
    })
  }, [selectedNodeId])

  useEffect(() => {
    const object = nodeMapRef.current.get(selectedNodeId)
    if (!object) return
    const applyMaterial = (child) => {
      if (!child.isMesh) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => {
        if (onMaterialChange?.color) material.color?.set(onMaterialChange.color)
        if (typeof onMaterialChange?.metalness === 'number' && 'metalness' in material) material.metalness = onMaterialChange.metalness
        if (typeof onMaterialChange?.roughness === 'number' && 'roughness' in material) material.roughness = onMaterialChange.roughness
        if (typeof onMaterialChange?.opacity === 'number' && 'opacity' in material) {
          material.opacity = onMaterialChange.opacity
          material.transparent = onMaterialChange.opacity < 1
        }
      })
    }
    object.traverse(applyMaterial)
  }, [onMaterialChange, selectedNodeId])

  return <div ref={containerRef} className="modeling-viewport-canvas" role="application" aria-label="3D modeling viewport" />
})
