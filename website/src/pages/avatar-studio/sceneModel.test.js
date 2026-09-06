import { describe, expect, it } from 'vitest'
import { cloneScene, createSceneProject, normalizeSceneProject, updateNode } from './sceneModel'

describe('avatar modeling scene model', () => {
  it('creates a versioned scene with camera and editor collections', () => {
    const scene = createSceneProject({ id: 'eve', label: 'Eve', renderer: 'vrm', url: '/eve.vrm' })
    expect(scene.schemaVersion).toBe(1)
    expect(scene.model.id).toBe('eve')
    expect(scene.camera.position).toHaveLength(3)
    expect(scene.nodes).toEqual([])
  })

  it('normalizes partial saved scenes and updates nodes immutably', () => {
    const scene = normalizeSceneProject({ nodes: [{ id: 'mesh', name: 'Mesh', visible: true }] })
    const updated = updateNode(scene, 'mesh', { visible: false })
    expect(updated.nodes[0].visible).toBe(false)
    expect(scene.nodes[0].visible).toBe(true)
    expect(cloneScene(updated)).toEqual(updated)
  })
})
