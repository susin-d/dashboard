import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createModelingProject,
  getModelingProject,
  listModelingProjects,
  loadModelingAssetBlob,
  saveModelingVersion,
  uploadModelingAsset,
} from '../../lib/modelingApi'
import { cloneScene, createSceneProject, normalizeSceneProject } from './sceneModel'

export function useModelingProject(activeModel) {
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState(null)
  const [projectName, setProjectName] = useState('Untitled avatar scene')
  const [scene, setSceneState] = useState(() => createSceneProject(activeModel))
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState('local')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    listModelingProjects().then((result) => {
      if (!cancelled) setProjects(result?.projects || [])
    }).catch(() => {
      if (!cancelled) setStatus('local')
    })
    return () => { cancelled = true }
  }, [])

  const setScene = useCallback((nextScene) => {
    setSceneState((current) => {
      const next = typeof nextScene === 'function' ? nextScene(current) : nextScene
      return normalizeSceneProject(next, activeModel)
    })
    setDirty(true)
  }, [activeModel])

  const openProject = useCallback(async (id) => {
    setError('')
    try {
      const result = await getModelingProject(id)
      setProjectId(result.id)
      setProjectName(result.name)
      setSceneState(normalizeSceneProject(result.scene, activeModel))
      setDirty(false)
      setStatus('saved')
      return result
    } catch (err) {
      setError(err?.message || 'Could not open project.')
    }
  }, [activeModel])

  const saveProject = useCallback(async (message = 'Manual save') => {
    setError('')
    try {
      let currentId = projectId
      if (!currentId) {
        const created = await createModelingProject(projectName)
        currentId = created.id
        setProjectId(currentId)
        setProjects((items) => [created, ...items])
      }
      await saveModelingVersion(currentId, cloneScene(scene), message)
      setDirty(false)
      setStatus('saved')
      return currentId
    } catch (err) {
      setError(err?.message || 'Could not save project.')
      setStatus('error')
      throw err
    }
  }, [projectId, projectName, scene])

  const importAsset = useCallback(async (file, options = {}) => {
    const currentId = projectId || await saveProject('Create project for imported asset')
    if (!currentId) throw new Error('Create a project before importing an asset.')
    return uploadModelingAsset(currentId, file, options)
  }, [projectId, saveProject])

  const getAssetBlob = useCallback(async (assetId) => {
    if (!projectId || !assetId) return null
    return loadModelingAssetBlob(projectId, assetId)
  }, [projectId])

  const currentProject = useMemo(() => ({ id: projectId, name: projectName, scene, dirty, status }), [projectId, projectName, scene, dirty, status])

  return {
    projects,
    currentProject,
    scene,
    setScene,
    setProjectName,
    openProject,
    saveProject,
    importAsset,
    getAssetBlob,
    error,
    setError,
  }
}
