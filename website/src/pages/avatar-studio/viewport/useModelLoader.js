import { useEffect } from 'react'
import * as THREE from 'three'
import { createNodeId, formatFromSource, toArray } from './viewportUtils'
import { loadLoaderModules } from './viewportLoaders'

export function useModelLoader({ source, sceneRef, rootRef, nodeMapRef, cameraRef, controlsRef, mixerRef, clipsRef, nodesRef, savedCameraRef, statusRef, onAnimationClips, onSceneGraph }) {
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
      mixerRef.current?.stopAllAction?.()
      mixerRef.current = null
      clipsRef.current = []
      onAnimationClips?.([])
      statusRef.current?.('loading')
      try {
        const { GLTFLoader, VRMLoaderPlugin, OBJLoader, FBXLoader, MTLLoader } = await loadLoaderModules()
        const format = formatFromSource(source)
        const manager = new THREE.LoadingManager()
        const objectUrls = []
        if (source.files?.length) {
          const fileMap = new Map(source.files.flatMap((file) => [[file.name, file], [file.webkitRelativePath, file]]))
          manager.setURLModifier((url) => {
            const decoded = decodeURIComponent(url)
            const name = decoded.split('/').pop()
            const file = fileMap.get(decoded) || fileMap.get(name)
            if (!file) return url
            const objectUrl = URL.createObjectURL(file)
            objectUrls.push(objectUrl)
            return objectUrl
          })
        }
        const onLoaded = (root, animations = [], metadata = {}) => {
          if (cancelled) return
          if (!root) throw new Error('The model did not contain a scene.')
          root.userData.vrm = metadata.vrm || null
          root.userData.originalGltfExtensions = metadata.extensions || null
          root.userData.sourceFormat = format
          const persistedNodes = nodesRef.current
          const usedPersistedIds = new Set()
          root.traverse((object) => {
            if (!object.name) object.name = object.type
            const persistedNode = persistedNodes.find((node) => !usedPersistedIds.has(node.id) && node.name === object.name && node.type === object.type)
            const nodeId = persistedNode?.id || createNodeId()
            if (persistedNode) usedPersistedIds.add(persistedNode.id)
            object.userData.nodeId = nodeId
            if (persistedNode) {
              object.visible = persistedNode.visible !== false
              if (Array.isArray(persistedNode.position)) object.position.set(...persistedNode.position)
              if (Array.isArray(persistedNode.rotation)) object.rotation.set(...persistedNode.rotation)
              if (Array.isArray(persistedNode.scale)) object.scale.set(...persistedNode.scale)
              if (persistedNode.textureDataUrl) object.userData.textureDataUrl = persistedNode.textureDataUrl
            }
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
          const savedCamera = savedCameraRef.current
          const targetY = Math.max(0.5, size.y * 0.45)
          const framingDistance = radius / (2 * Math.tan(THREE.MathUtils.degToRad(cameraRef.current.fov / 2))) * 1.15
          if (Array.isArray(savedCamera?.position) && Array.isArray(savedCamera?.target)) {
            cameraRef.current.position.fromArray(savedCamera.position)
            controlsRef.current.target.fromArray(savedCamera.target)
          } else {
            cameraRef.current.position.set(0, targetY, Math.max(1.5, framingDistance))
            controlsRef.current.target.set(0, targetY, 0)
          }
          controlsRef.current.update()
          const nodes = []
          root.traverse((object) => {
            if (object === root || !object.userData.nodeId) return
            const material = object.isMesh ? (Array.isArray(object.material) ? object.material[0] : object.material) : null
            nodes.push({ id: object.userData.nodeId, name: object.name, type: object.type, visible: object.visible, position: toArray(object.position), rotation: toArray(object.rotation), scale: toArray(object.scale), parentId: object.parent?.userData?.nodeId || null, isMesh: Boolean(object.isMesh), hasUv: Boolean(object.isMesh && object.geometry?.getAttribute?.('uv')), hasTexture: Boolean(material?.map), materialColor: material?.color ? `#${material.color.getHexString()}` : null, metalness: material?.metalness ?? 0, roughness: material?.roughness ?? 0.5, opacity: material?.opacity ?? 1, textureDataUrl: object.userData.textureDataUrl || null, materialSlots: Array.isArray(object.material) ? object.material.map((item) => item?.name || 'Material') : material ? [material.name || 'Material'] : [] })
          })
          clipsRef.current = animations || []
          mixerRef.current = animations?.length ? new THREE.AnimationMixer(root) : null
          onAnimationClips?.((animations || []).map((clip) => ({ id: clip.uuid, name: clip.name || 'Imported action', duration: clip.duration, source: format })))
          onSceneGraph?.(nodes, { initial: true, format, animations: animations.map((clip) => ({ id: clip.uuid, name: clip.name || 'Imported action', duration: clip.duration, source: format })) })
          statusRef.current?.('ready')
          objectUrls.forEach((url) => URL.revokeObjectURL(url))
        }
        const file = source.file || source.files?.find((item) => formatFromSource({ file: item }) === format) || source.files?.[0]
        if (file && format === 'obj') {
          const materialFile = source.files?.find((item) => item.name.toLowerCase().endsWith('.mtl'))
          let materials = null
          if (materialFile) {
            materials = new MTLLoader(manager).parse(await materialFile.text(), '')
            materials.preload()
          }
          const loader = new OBJLoader(manager)
          if (materials) loader.setMaterials(materials)
          onLoaded(loader.parse(await file.text()), [])
        } else if (file && format === 'fbx') {
          const loader = new FBXLoader(manager)
          const object = loader.parse(await file.arrayBuffer(), '')
          onLoaded(object, object.animations || [])
        } else if (file) {
          const loader = new GLTFLoader(manager)
          loader.register((parser) => new VRMLoaderPlugin(parser))
          const buffer = await file.arrayBuffer()
          loader.parse(buffer, '', (gltf) => onLoaded(gltf.scene || gltf.scenes?.[0], gltf.animations || [], { vrm: gltf.userData?.vrm, extensions: gltf.parser?.json?.extensions }), (error) => { throw error })
        } else {
          const loader = new GLTFLoader(manager)
          loader.register((parser) => new VRMLoaderPlugin(parser))
          await loader.loadAsync(source.url).then((gltf) => onLoaded(gltf.scene || gltf.scenes?.[0], gltf.animations || [], { vrm: gltf.userData?.vrm, extensions: gltf.parser?.json?.extensions }))
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
  }, [source, onAnimationClips, onSceneGraph, sceneRef, rootRef, nodeMapRef, cameraRef, controlsRef, mixerRef, clipsRef, nodesRef, savedCameraRef, statusRef])
}
