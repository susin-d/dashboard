import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'

let loaderModulesPromise

function loadLoaderModules() {
  if (!loaderModulesPromise) {
    loaderModulesPromise = Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('@pixiv/three-vrm'),
      import('three/addons/exporters/GLTFExporter.js'),
    ]).then(([gltf, vrm, exporter]) => ({ GLTFLoader: gltf.GLTFLoader, VRMLoaderPlugin: vrm.VRMLoaderPlugin, GLTFExporter: exporter.GLTFExporter }))
  }
  return loaderModulesPromise
}

function toArray(vector) {
  return [Number(vector.x.toFixed(4)), Number(vector.y.toFixed(4)), Number(vector.z.toFixed(4))]
}

function applyArray(vector, values, fallback) {
  const next = Array.isArray(values) && values.length === 3 ? values : fallback
  vector.set(Number(next[0]) || 0, Number(next[1]) || 0, Number(next[2]) || 0)
}

export const SceneViewport = forwardRef(function SceneViewport({ source, selectedNodeId, tool, showGrid = true, showAxes = true, onSceneGraph, onSelectNode, onNodeTransform, onMaterialChange, onCameraChange, resetSignal, onStatus }, ref) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const controlsRef = useRef(null)
  const transformRef = useRef(null)
  const rootRef = useRef(null)
  const nodeMapRef = useRef(new Map())
  const selectedNodeIdRef = useRef(selectedNodeId)
  const toolRef = useRef(tool)
  const statusRef = useRef(onStatus)

  selectedNodeIdRef.current = selectedNodeId
  toolRef.current = tool
  statusRef.current = onStatus

  useImperativeHandle(ref, () => ({
    exportScene: async (format = 'glb') => {
      const root = rootRef.current
      if (!root) throw new Error('Load a 3D model before exporting.')
      const { GLTFExporter } = await loadLoaderModules()
      const exporter = new GLTFExporter()
      const result = await new Promise((resolve, reject) => exporter.parse(root, resolve, reject, {
        binary: format === 'glb' || format === 'vrm',
        includeCustomExtensions: true,
      }))
      const isBinary = result instanceof ArrayBuffer
      const blob = new Blob([isBinary ? result : JSON.stringify(result)], { type: isBinary ? 'model/gltf-binary' : 'model/gltf+json' })
      return { blob, filename: `avatar-scene.${format === 'vrm' ? 'vrm' : format}` }
    },
  }), [])

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

    const grid = new THREE.GridHelper(12, 24, 0x71809a, 0x27354b)
    grid.position.y = 0
    grid.name = 'Studio grid'
    editorScene.add(grid)
    const axes = new THREE.AxesHelper(1.5)
    axes.name = 'Studio axes'
    editorScene.add(axes)
    editorScene.add(new THREE.HemisphereLight(0xdbeafe, 0x172033, 2.4))
    const keyLight = new THREE.DirectionalLight(0xffffff, 3)
    keyLight.position.set(3, 5, 4)
    keyLight.castShadow = true
    editorScene.add(keyLight)
    const fillLight = new THREE.PointLight(0x8aa4ff, 2, 10)
    fillLight.position.set(-3, 2, 2)
    editorScene.add(fillLight)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(0, 1, 0)
    controls.addEventListener('change', () => onCameraChange?.({ position: toArray(camera.position), target: toArray(controls.target) }))
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

    const pointerDown = (event) => {
      if (toolRef.current !== 'select' || transform.dragging) return
      const bounds = renderer.domElement.getBoundingClientRect()
      const pointer = new THREE.Vector2(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1)
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(rootRef.current ? [rootRef.current] : [], true)
      const hit = hits.find((item) => item.object.userData.nodeId)
      onSelectNode?.(hit?.object?.userData?.nodeId || null)
    }
    renderer.domElement.addEventListener('pointerdown', pointerDown)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      transform.dispose()
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
    const root = rootRef.current
    if (!root || !selectedNodeId) return
    const object = nodeMapRef.current.get(selectedNodeId)
    if (object) object.traverse((child) => {
      if (!child.isMesh) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => { material.emissive?.setHex(0x202c55) })
    })
  }, [selectedNodeId])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!source?.url && !source?.file) return
      const editorScene = sceneRef.current
      if (!editorScene) return
      if (rootRef.current) {
        editorScene.remove(rootRef.current)
        rootRef.current.traverse((child) => { if (child.geometry) child.geometry.dispose() })
        rootRef.current = null
        nodeMapRef.current.clear()
      }
      statusRef.current?.('loading')
      try {
        const { GLTFLoader, VRMLoaderPlugin } = await loadLoaderModules()
        const manager = new THREE.LoadingManager()
        const objectUrls = []
        if (source.files?.length) {
          const fileMap = new Map(source.files.map((file) => [file.name, file]))
          manager.setURLModifier((url) => {
            const name = decodeURIComponent(url).split('/').pop()
            const file = fileMap.get(name)
            if (!file) return url
            const objectUrl = URL.createObjectURL(file)
            objectUrls.push(objectUrl)
            return objectUrl
          })
        }
        const loader = new GLTFLoader(manager)
        loader.register((parser) => new VRMLoaderPlugin(parser))
        const onLoaded = (gltf) => {
          if (cancelled) return
          const root = gltf.scene || gltf.scenes?.[0]
          if (!root) throw new Error('The model did not contain a scene.')
          root.userData.vrm = gltf.userData?.vrm || null
          root.userData.originalGltfExtensions = gltf.parser?.json?.extensions || null
          root.traverse((object) => {
            if (!object.name) object.name = object.type
            const nodeId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
            object.userData.nodeId = nodeId
            object.castShadow = true
            object.receiveShadow = true
            nodeMapRef.current.set(nodeId, object)
          })
          rootRef.current = root
          editorScene.add(root)
          const box = new THREE.Box3().setFromObject(root)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          const radius = Math.max(size.x, size.y, size.z, 1)
          root.position.sub(new THREE.Vector3(center.x, box.min.y, center.z))
          cameraRef.current.position.set(0, Math.max(1, radius * 0.8), radius * 2.8)
          controlsRef.current.target.set(0, Math.max(0.5, size.y * 0.45), 0)
          controlsRef.current.update()
          const nodes = []
          root.traverse((object) => {
            if (object === root || !object.userData.nodeId) return
            const material = object.isMesh ? (Array.isArray(object.material) ? object.material[0] : object.material) : null
            nodes.push({ id: object.userData.nodeId, name: object.name, type: object.type, visible: object.visible, position: toArray(object.position), rotation: toArray(object.rotation), scale: toArray(object.scale), parentId: object.parent?.userData?.nodeId || null, materialColor: material?.color ? `#${material.color.getHexString()}` : '#ffffff', metalness: material?.metalness ?? 0, roughness: material?.roughness ?? 0.5 })
          })
          onSceneGraph?.(nodes)
          statusRef.current?.('ready')
          objectUrls.forEach((url) => URL.revokeObjectURL(url))
        }
        if (source.file || source.files?.[0]) {
          const file = source.file || source.files[0]
          const buffer = await file.arrayBuffer()
          loader.parse(buffer, '', onLoaded, (error) => { throw error })
        } else {
          await loader.loadAsync(source.url).then(onLoaded)
        }
      } catch (error) {
        if (!cancelled) {
          statusRef.current?.('error')
          statusRef.current?.(error?.message || 'Could not load model.')
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [source, onSceneGraph])

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
      })
    }
    object.traverse(applyMaterial)
  }, [onMaterialChange, selectedNodeId])

  return <div ref={containerRef} className="modeling-viewport-canvas" role="application" aria-label="3D modeling viewport" />
})
