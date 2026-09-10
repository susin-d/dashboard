import { useImperativeHandle } from 'react'
import * as THREE from 'three'
import { createNodeId, disposeObject, serializeNode, themeColor } from './viewportUtils'
import { loadLoaderModules } from './viewportLoaders'

export function useViewportActions(ref, { sceneRef, rootRef, nodeMapRef, mixerRef, clipsRef, activeAnimationId, onSceneGraph, onSelectNode }) {
  useImperativeHandle(ref, () => {
    const serializeSceneGraph = () => [...nodeMapRef.current.values()].map(serializeNode)

    return ({
      addPrimitive: (type = 'box') => {
        const editorScene = sceneRef.current
        if (!editorScene) return null
        const root = rootRef.current || new THREE.Group()
        if (!rootRef.current) {
          root.name = 'Scene'
          rootRef.current = root
          editorScene.add(root)
        }
        const geometry = type === 'sphere' ? new THREE.SphereGeometry(0.5, 24, 16) : type === 'cylinder' ? new THREE.CylinderGeometry(0.45, 0.45, 1, 24) : new THREE.BoxGeometry(0.8, 0.8, 0.8)
        const material = new THREE.MeshStandardMaterial({ color: themeColor('--color-primary'), roughness: 0.45, metalness: 0.15 })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.name = `${type[0].toUpperCase()}${type.slice(1)} primitive`
        mesh.userData.nodeId = createNodeId()
        mesh.position.set(0, 0.5, 0)
        root.add(mesh)
        nodeMapRef.current.set(mesh.userData.nodeId, mesh)
        onSceneGraph?.(serializeSceneGraph())
        onSelectNode?.(mesh.userData.nodeId)
        return mesh.userData.nodeId
      },
      duplicateNode: (nodeId) => {
        const object = nodeMapRef.current.get(nodeId)
        if (!object?.parent) return null
        const clone = object.clone(true)
        const idMap = new Map()
        clone.traverse((child) => {
          const nextId = createNodeId()
          idMap.set(child, nextId)
          child.userData = { ...child.userData, nodeId: nextId }
          nodeMapRef.current.set(nextId, child)
        })
        clone.position.x += 0.25
        object.parent.add(clone)
        onSceneGraph?.(serializeSceneGraph())
        onSelectNode?.(idMap.get(clone))
        return idMap.get(clone)
      },
      deleteNode: (nodeId) => {
        const object = nodeMapRef.current.get(nodeId)
        if (!object?.parent) return false
        const removed = []
        object.traverse((child) => {
          if (child.userData?.nodeId) removed.push(child.userData.nodeId)
        })
        object.parent.remove(object)
        disposeObject(object)
        removed.forEach((id) => nodeMapRef.current.delete(id))
        onSceneGraph?.(serializeSceneGraph())
        onSelectNode?.(null)
        return true
      },
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
      setAnimationFrame: (frame, fps = 24) => {
        const mixer = mixerRef.current
        if (!mixer || !clipsRef.current.length) return false
        const clip = clipsRef.current.find((item) => item.name === activeAnimationId || item.uuid === activeAnimationId) || clipsRef.current[0]
        mixer.setTime(Math.max(0, Number(frame)) / Math.max(1, Number(fps)))
        return Boolean(clip)
      },
    })
  }, [activeAnimationId, onSceneGraph, onSelectNode, sceneRef, rootRef, nodeMapRef, mixerRef, clipsRef])
}
