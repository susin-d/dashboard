import { ConfirmDialog, FormField, Modal } from '../../components/ui'

export function WorkspaceDialogs({
  newFilePrompt,
  setNewFilePrompt,
  newFileName,
  setNewFileName,
  handleConfirmCreate,
  newFolderPrompt,
  setNewFolderPrompt,
  newFolderName,
  setNewFolderName,
  handleConfirmCreateFolder,
  createWorkspaceOpen,
  setCreateWorkspaceOpen,
  newWorkspaceName,
  setNewWorkspaceName,
  handleConfirmCreateWorkspace,
  workspaceToRename,
  setWorkspaceToRename,
  renameWorkspaceName,
  setRenameWorkspaceName,
  handleConfirmRenameWorkspace,
  workspaceToDelete,
  setWorkspaceToDelete,
  handleConfirmDeleteWorkspace,
}) {
  return (
    <>
      <Modal isOpen={newFilePrompt} onClose={() => setNewFilePrompt(false)} title="New File" subtitle="Creates inside the current workspace folder. Use folder/file.ext to nest.">
        <FormField label="File name" id="workspace-new-file-name">
          <input
            id="workspace-new-file-name"
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmCreate()
            }}
            placeholder="path/to/filename.ext  e.g. src/app.js"
            data-modal-initial-focus
          />
        </FormField>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={() => setNewFilePrompt(false)}>Cancel</button>
          <button type="button" className="primary-button" onClick={handleConfirmCreate} disabled={!newFileName.trim()}>Create</button>
        </div>
      </Modal>

      <Modal isOpen={newFolderPrompt} onClose={() => setNewFolderPrompt(false)} title="New Folder" subtitle="Creates a folder inside the workspace. You can then add files inside it.">
        <FormField label="Folder name" id="workspace-new-folder-name">
          <input
            id="workspace-new-folder-name"
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmCreateFolder()
            }}
            placeholder="folder name  e.g. src/components"
            data-modal-initial-focus
          />
        </FormField>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={() => setNewFolderPrompt(false)}>Cancel</button>
          <button type="button" className="primary-button" onClick={handleConfirmCreateFolder} disabled={!newFolderName.trim()}>Create Folder</button>
        </div>
      </Modal>

      <Modal
        isOpen={createWorkspaceOpen}
        onClose={() => setCreateWorkspaceOpen(false)}
        title="Create New Workspace"
        subtitle="Each workspace is an isolated folder — like a project root"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleConfirmCreateWorkspace()
          }}
        >
          <FormField label="Workspace Name" id="new-workspace-name">
            <input
              id="new-workspace-name"
              type="text"
              className="text-input"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="e.g., Portfolio Website, Backend API, Notes"
              autoFocus
              data-modal-initial-focus
            />
          </FormField>
          <p className="workspace-modal-hint">This will create a folder on disk/cloud. Switch workspaces to open its files in the editor.</p>
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setCreateWorkspaceOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={!newWorkspaceName.trim()}
            >
              Create Workspace
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(workspaceToRename)}
        onClose={() => setWorkspaceToRename(null)}
        title="Rename Workspace"
        subtitle="Update display name for workspace"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleConfirmRenameWorkspace()
          }}
        >
          <FormField label="Workspace Name" id="rename-workspace-name">
            <input
              id="rename-workspace-name"
              type="text"
              className="text-input"
              value={renameWorkspaceName}
              onChange={(e) => setRenameWorkspaceName(e.target.value)}
              placeholder="e.g., Project Name"
              autoFocus
              data-modal-initial-focus
            />
          </FormField>
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setWorkspaceToRename(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={!renameWorkspaceName.trim()}
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(workspaceToDelete)}
        title="Delete Workspace"
        message={`Are you sure you want to delete "${workspaceToDelete?.name}"? All files and folders inside this workspace will be permanently removed.`}
        confirmLabel="Delete Workspace"
        destructive
        onConfirm={handleConfirmDeleteWorkspace}
        onCancel={() => setWorkspaceToDelete(null)}
      />
    </>
  )
}
