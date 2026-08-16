import { useCallback, useRef, useState } from 'react'
import { useWorkspaceBridge } from './useWorkspaceBridge'
import { createIgnoreMatcher, parseSdIgnore } from './sdIgnore'

const SDIGNORE_FILENAME = '.sdignore'

export function useWorkspace() {
  const bridge = useWorkspaceBridge()
  const [fileTree, setFileTree] = useState([])
  const [openTabs, setOpenTabs] = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dirtyFiles = useRef(new Set())
  const ignoreMatcherRef = useRef(() => false)

  const refreshTree = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const files = await bridge.listFiles()
      // Find .sdignore and parse it
      const sdIgnoreFile = files.find((f) => f.name === SDIGNORE_FILENAME && !f.is_directory)
      if (sdIgnoreFile) {
        try {
          const content = await bridge.readFile(sdIgnoreFile.path)
          const patterns = parseSdIgnore(content)
          ignoreMatcherRef.current = createIgnoreMatcher(patterns)
        } catch {
          ignoreMatcherRef.current = createIgnoreMatcher([])
        }
      } else {
        ignoreMatcherRef.current = createIgnoreMatcher([])
      }
      // Filter ignored files
      const filtered = files.filter((f) => !ignoreMatcherRef.current(f.path))
      setFileTree(filtered)
    } catch (err) {
      setError(err.message || 'Failed to load workspace files.')
    } finally {
      setLoading(false)
    }
  }, [bridge])

  const openFile = useCallback(
    async (filePath) => {
      const existing = openTabs.find((tab) => tab.path === filePath)
      if (existing) {
        setActiveTab(filePath)
        return
      }
      try {
        const content = await bridge.readFile(filePath)
        const name = filePath.split('/').pop()
        setOpenTabs((tabs) => [...tabs, { path: filePath, name, content, savedContent: content }])
        setActiveTab(filePath)
      } catch (err) {
        setError(err.message || 'Failed to open file.')
      }
    },
    [bridge, openTabs],
  )

  const closeTab = useCallback(
    (filePath) => {
      setOpenTabs((tabs) => tabs.filter((tab) => tab.path !== filePath))
      dirtyFiles.current.delete(filePath)
      if (activeTab === filePath) {
        setActiveTab(() => {
          const remaining = openTabs.filter((tab) => tab.path !== filePath)
          return remaining.length > 0 ? remaining[remaining.length - 1].path : null
        })
      }
    },
    [activeTab, openTabs],
  )

  const updateTabContent = useCallback((filePath, newContent) => {
    setOpenTabs((tabs) =>
      tabs.map((tab) => {
        if (tab.path !== filePath) return tab
        const isDirty = newContent !== tab.savedContent
        if (isDirty) {
          dirtyFiles.current.add(filePath)
        } else {
          dirtyFiles.current.delete(filePath)
        }
        return { ...tab, content: newContent }
      }),
    )
  }, [])

  const saveFile = useCallback(
    async (filePath) => {
      const tab = openTabs.find((t) => t.path === filePath)
      if (!tab) return
      try {
        await bridge.writeFile(filePath, tab.content)
        dirtyFiles.current.delete(filePath)
        setOpenTabs((tabs) =>
          tabs.map((t) => (t.path === filePath ? { ...t, savedContent: t.content } : t)),
        )
      } catch (err) {
        setError(err.message || 'Failed to save file.')
      }
    },
    [bridge, openTabs],
  )

  const deleteWorkspaceFile = useCallback(
    async (filePath) => {
      try {
        await bridge.deleteFile(filePath)
        closeTab(filePath)
        await refreshTree()
      } catch (err) {
        setError(err.message || 'Failed to delete file.')
      }
    },
    [bridge, closeTab, refreshTree],
  )

  const createFile = useCallback(
    async (filePath, content = '') => {
      try {
        await bridge.writeFile(filePath, content)
        await refreshTree()
        await openFile(filePath)
      } catch (err) {
        setError(err.message || 'Failed to create file.')
      }
    },
    [bridge, refreshTree, openFile],
  )

  const isFileDirty = useCallback((filePath) => dirtyFiles.current.has(filePath), [])

  return {
    fileTree,
    openTabs,
    activeTab,
    loading,
    error,
    isTauri: bridge.isTauri,
    setActiveTab,
    refreshTree,
    openFile,
    closeTab,
    updateTabContent,
    saveFile,
    deleteFile: deleteWorkspaceFile,
    createFile,
    isFileDirty,
    clearError: () => setError(''),
  }
}
