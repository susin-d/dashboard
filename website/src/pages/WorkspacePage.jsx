import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from './workspace/useWorkspace'
import { WorkspaceToolbar } from './workspace/WorkspaceToolbar'
import { WorkspaceFileTree } from './workspace/WorkspaceFileTree'
import { WorkspaceEditor } from './workspace/WorkspaceEditor'
import { WorkspaceTerminal } from './workspace/WorkspaceTerminal'
import { WorkspaceEvePanel } from './workspace/WorkspaceEvePanel'

export function WorkspacePage() {
  const workspace = useWorkspace()
  const [evePanelCollapsed, setEvePanelCollapsed] = useState(true)
  const [terminalVisible, setTerminalVisible] = useState(false)
  const [newFilePrompt, setNewFilePrompt] = useState(false)
  const [newFileName, setNewFileName] = useState('')

  useEffect(() => {
    workspace.refreshTree()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateFile = useCallback(() => {
    setNewFilePrompt(true)
    setNewFileName('')
  }, [])

  const handleConfirmCreate = useCallback(async () => {
    const name = newFileName.trim()
    if (!name) return
    await workspace.createFile(name)
    setNewFilePrompt(false)
    setNewFileName('')
  }, [newFileName, workspace])

  const handleKeyboardSave = useCallback(
    (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        if (workspace.activeTab) {
          workspace.saveFile(workspace.activeTab)
        }
      }
    },
    [workspace],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardSave)
    return () => document.removeEventListener('keydown', handleKeyboardSave)
  }, [handleKeyboardSave])

  return (
    <div className="workspace-page">
      <WorkspaceToolbar
        isTauri={workspace.isTauri}
        loading={workspace.loading}
        onRefresh={workspace.refreshTree}
        terminalVisible={terminalVisible}
        onToggleTerminal={() => setTerminalVisible(!terminalVisible)}
      />

      {workspace.error && (
        <div className="workspace-error">
          <span>{workspace.error}</span>
          <button onClick={workspace.clearError}>×</button>
        </div>
      )}

      <div className="workspace-layout">
        <WorkspaceFileTree
          files={workspace.fileTree}
          activeFile={workspace.activeTab}
          onFileSelect={workspace.openFile}
          onDelete={workspace.deleteFile}
          onCreateFile={handleCreateFile}
        />

        <div className="workspace-center">
          <WorkspaceEditor
            tabs={workspace.openTabs}
            activeTab={workspace.activeTab}
            onTabSelect={workspace.setActiveTab}
            onTabClose={workspace.closeTab}
            onContentChange={workspace.updateTabContent}
            onSave={workspace.saveFile}
            isFileDirty={workspace.isFileDirty}
          />
          {terminalVisible && (
            <WorkspaceTerminal isTauri={workspace.isTauri} />
          )}
        </div>

        <WorkspaceEvePanel
          collapsed={evePanelCollapsed}
          onToggle={() => setEvePanelCollapsed(!evePanelCollapsed)}
        />
      </div>

      {newFilePrompt && (
        <div className="workspace-new-file-overlay" onClick={() => setNewFilePrompt(false)}>
          <div
            className="workspace-new-file-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>New File</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmCreate()
                if (e.key === 'Escape') setNewFilePrompt(false)
              }}
              placeholder="path/to/filename.ext"
              autoFocus
            />
            <div className="workspace-new-file-actions">
              <button onClick={() => setNewFilePrompt(false)}>Cancel</button>
              <button
                className="primary"
                onClick={handleConfirmCreate}
                disabled={!newFileName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
