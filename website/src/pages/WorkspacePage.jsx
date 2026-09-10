import "../styles/pages/workspace-dialogs.css"
import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from './workspace/useWorkspace'
import { WorkspaceToolbar } from './workspace/WorkspaceToolbar'
import { WorkspaceOverview } from './workspace/WorkspaceOverview'
import { WorkspaceFileTree } from './workspace/WorkspaceFileTree'
import { WorkspaceEditor } from './workspace/WorkspaceEditor'
import { WorkspaceTerminal } from './workspace/WorkspaceTerminal'
import { WorkspaceBrowser } from './workspace/WorkspaceBrowser'
import { WorkspaceEvePanel } from './workspace/WorkspaceEvePanel'
import { WorkspaceDialogs } from './workspace/WorkspaceDialogs'
import { Cloud, Monitor, Save, Circle } from 'lucide-react'

export function WorkspacePage() {
  const workspace = useWorkspace()
  const [view, setView] = useState('overview')
  const [evePanelCollapsed, setEvePanelCollapsed] = useState(true)
  const [terminalVisible, setTerminalVisible] = useState(false)
  const [browserVisible, setBrowserVisible] = useState(false)
  const [browserUrl, setBrowserUrl] = useState('')
  const [newFilePrompt, setNewFilePrompt] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFolderPrompt, setNewFolderPrompt] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Workspace management modal states
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [workspaceToRename, setWorkspaceToRename] = useState(null)
  const [renameWorkspaceName, setRenameWorkspaceName] = useState('')
  const [workspaceToDelete, setWorkspaceToDelete] = useState(null)

  useEffect(() => {
    const init = async () => {
      await workspace.fetchWorkspaces()
      await workspace.refreshTree()
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateFile = useCallback(() => {
    setNewFilePrompt(true)
    setNewFileName('')
  }, [])

  const handleCreateFolder = useCallback(() => {
    setNewFolderPrompt(true)
    setNewFolderName('')
  }, [])

  const handleConfirmCreate = useCallback(async () => {
    const name = newFileName.trim()
    if (!name) return
    await workspace.createFile(name)
    setNewFilePrompt(false)
    setNewFileName('')
  }, [newFileName, workspace])

  const handleConfirmCreateFolder = useCallback(async () => {
    const name = newFolderName.trim().replace(/^\/+|\/+$/g, '')
    if (!name) return
    // Create folder via placeholder .keep file
    const placeholder = name.endsWith('/') ? `${name}.keep` : `${name}/.keep`
    await workspace.createFile(placeholder, '')
    setNewFolderPrompt(false)
    setNewFolderName('')
  }, [newFolderName, workspace])

  const handleConfirmCreateWorkspace = useCallback(async () => {
    const name = newWorkspaceName.trim()
    if (!name) return
    try {
      await workspace.createWorkspace(name)
      setCreateWorkspaceOpen(false)
      setNewWorkspaceName('')
    } catch {
      // Error handled by workspace hook
    }
  }, [newWorkspaceName, workspace])

  const handleOpenRenameWorkspace = useCallback((ws) => {
    setWorkspaceToRename(ws)
    setRenameWorkspaceName(ws.name)
  }, [])

  const handleConfirmRenameWorkspace = useCallback(async () => {
    if (!workspaceToRename || !renameWorkspaceName.trim()) return
    try {
      await workspace.renameWorkspace(workspaceToRename.id, renameWorkspaceName.trim())
      setWorkspaceToRename(null)
      setRenameWorkspaceName('')
    } catch {
      // Error handled by workspace hook
    }
  }, [renameWorkspaceName, workspace, workspaceToRename])

  const handleConfirmDeleteWorkspace = useCallback(async () => {
    if (!workspaceToDelete) return
    const targetId = workspaceToDelete.id
    try {
      await workspace.deleteWorkspace(targetId)
      setWorkspaceToDelete(null)
      if (workspace.activeWorkspaceId === targetId || workspace.workspaces.length <= 1) {
        setView('overview')
      }
    } catch {
      // Error handled by workspace hook
    }
  }, [workspace, workspaceToDelete])

  const handleOpenWorkspace = useCallback(
    async (ws) => {
      await workspace.switchWorkspace(ws.id)
      setView('ide')
    },
    [workspace],
  )

  const handleEveAction = useCallback((action) => {
    if (action?.type === 'open_browser_url' && action.url) {
      setBrowserUrl(action.url)
      setBrowserVisible(true)
    }
  }, [])

  const handleRunHtml = useCallback(() => {
    setBrowserUrl('')
    setBrowserVisible(true)
  }, [])

  const activeHtmlContent = (() => {
    if (!browserVisible) return null
    const tab = workspace.openTabs?.find((t) => t.path === workspace.activeTab)
    if (!tab) return null
    if (!tab.path?.toLowerCase().endsWith('.html')) return null
    return tab.content ?? null
  })()

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
      {view === 'overview' ? (
        <>
          {workspace.error && (
            <div className="workspace-error">
              <span>{workspace.error}</span>
              <button onClick={workspace.clearError}>×</button>
            </div>
          )}
          <WorkspaceOverview
            workspaces={workspace.workspaces}
            activeWorkspaceId={workspace.activeWorkspaceId}
            loading={workspace.loading}
            onOpenWorkspace={handleOpenWorkspace}
            onOpenCreateWorkspace={() => {
              setNewWorkspaceName('')
              setCreateWorkspaceOpen(true)
            }}
            onOpenRenameWorkspace={handleOpenRenameWorkspace}
            onOpenDeleteWorkspace={(ws) => setWorkspaceToDelete(ws)}
          />
        </>
      ) : (
        <>
          <WorkspaceToolbar
            workspaces={workspace.workspaces}
            activeWorkspace={workspace.activeWorkspace}
            onBackToOverview={() => setView('overview')}
            onSwitchWorkspace={workspace.switchWorkspace}
            onOpenCreateWorkspace={() => {
              setNewWorkspaceName('')
              setCreateWorkspaceOpen(true)
            }}
            onOpenRenameWorkspace={handleOpenRenameWorkspace}
            onOpenDeleteWorkspace={(ws) => setWorkspaceToDelete(ws)}
            isTauri={workspace.isTauri}
            loading={workspace.loading}
            onRefresh={workspace.refreshTree}
            terminalVisible={terminalVisible}
            onToggleTerminal={() => setTerminalVisible(!terminalVisible)}
            browserVisible={browserVisible}
            onToggleBrowser={() => setBrowserVisible(!browserVisible)}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
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
              onCreateFolder={handleCreateFolder}
            />

            <div className={`workspace-center${browserVisible ? ' browser-open' : ''}`}>
              <div className="workspace-center-stack">
                <WorkspaceEditor
                  tabs={workspace.openTabs}
                  activeTab={workspace.activeTab}
                  onTabSelect={workspace.setActiveTab}
                  onTabClose={workspace.closeTab}
                  onContentChange={workspace.updateTabContent}
                  onSave={workspace.saveFile}
                  isFileDirty={workspace.isFileDirty}
                  onCreateFile={handleCreateFile}
                  onRunHtml={handleRunHtml}
                />
                {terminalVisible && (
                  <WorkspaceTerminal isTauri={workspace.isTauri} />
                )}
              </div>
              {browserVisible && (
                <WorkspaceBrowser
                  workspaceId={workspace.activeWorkspaceId}
                  initialUrl={browserUrl}
                  htmlContent={activeHtmlContent}
                  onClose={() => setBrowserVisible(false)}
                />
              )}
            </div>

            <WorkspaceEvePanel
              collapsed={evePanelCollapsed}
              onToggle={() => setEvePanelCollapsed(!evePanelCollapsed)}
              workspaceId={workspace.activeWorkspaceId}
              workspaceName={workspace.activeWorkspace?.name}
              activeFilePath={workspace.activeTab}
              onFilesChanged={workspace.refreshTree}
              onAction={handleEveAction}
            />
          </div>

          {/* VS Code-style status bar — spans full width below all panels */}
          <div className="workspace-statusbar">
            <div className="workspace-statusbar-left">
              <span className="workspace-statusbar-item workspace-statusbar-branch">
                {workspace.isTauri ? <Monitor size={12} /> : <Cloud size={12} />}
                {workspace.isTauri ? 'Local' : 'Cloud'}
              </span>
              {workspace.activeWorkspace && (
                <span className="workspace-statusbar-item">
                  {workspace.activeWorkspace.name}
                </span>
              )}
            </div>
            <div className="workspace-statusbar-right">
              {workspace.activeTab && (
                <>
                  {workspace.isFileDirty(workspace.activeTab) ? (
                    <span className="workspace-statusbar-item">
                      <Circle size={8} fill="currentColor" /> Unsaved
                    </span>
                  ) : (
                    <span className="workspace-statusbar-item workspace-statusbar-saved">
                      <Save size={11} /> Saved
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

        </>
      )}

      <WorkspaceDialogs
        newFilePrompt={newFilePrompt}
        setNewFilePrompt={setNewFilePrompt}
        newFileName={newFileName}
        setNewFileName={setNewFileName}
        handleConfirmCreate={handleConfirmCreate}
        newFolderPrompt={newFolderPrompt}
        setNewFolderPrompt={setNewFolderPrompt}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        handleConfirmCreateFolder={handleConfirmCreateFolder}
        createWorkspaceOpen={createWorkspaceOpen}
        setCreateWorkspaceOpen={setCreateWorkspaceOpen}
        newWorkspaceName={newWorkspaceName}
        setNewWorkspaceName={setNewWorkspaceName}
        handleConfirmCreateWorkspace={handleConfirmCreateWorkspace}
        workspaceToRename={workspaceToRename}
        setWorkspaceToRename={setWorkspaceToRename}
        renameWorkspaceName={renameWorkspaceName}
        setRenameWorkspaceName={setRenameWorkspaceName}
        handleConfirmRenameWorkspace={handleConfirmRenameWorkspace}
        workspaceToDelete={workspaceToDelete}
        setWorkspaceToDelete={setWorkspaceToDelete}
        handleConfirmDeleteWorkspace={handleConfirmDeleteWorkspace}
      />
    </div>
  )
}
