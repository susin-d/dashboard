import { useCallback, useMemo } from 'react'
import {
  loadFileTree,
  readFile,
  writeFile,
  deleteFile,
} from '../../lib/workspaceFilesApi'

function isTauriEnvironment() {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined
}

export function useWorkspaceBridge() {
  const isTauri = useMemo(() => isTauriEnvironment(), [])

  const listFiles = useCallback(async () => {
    if (isTauri) {
      // Tauri native FS — will be implemented when Tauri scaffold is ready
      // For now, fall through to cloud API
    }
    return loadFileTree()
  }, [isTauri])

  const readFileContent = useCallback(
    async (filePath) => {
      if (isTauri) {
        // Tauri native FS read — future implementation
      }
      const result = await readFile(filePath)
      return result?.content ?? ''
    },
    [isTauri],
  )

  const writeFileContent = useCallback(
    async (filePath, content, encoding = 'utf-8') => {
      if (isTauri) {
        // Tauri native FS write — future implementation
      }
      return writeFile(filePath, content, encoding)
    },
    [isTauri],
  )

  const removeFile = useCallback(
    async (filePath) => {
      if (isTauri) {
        // Tauri native FS delete — future implementation
      }
      return deleteFile(filePath)
    },
    [isTauri],
  )

  return {
    isTauri,
    listFiles,
    readFile: readFileContent,
    writeFile: writeFileContent,
    deleteFile: removeFile,
  }
}
