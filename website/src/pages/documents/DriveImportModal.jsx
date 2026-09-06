import { FileText, FolderInput } from 'lucide-react'
import { Modal, SearchBar } from '../../components/ui'

export function DriveImportModal({
  driveOpen,
  setDriveOpen,
  driveLoading,
  driveError,
  driveFiles,
  filteredDriveFiles,
  driveQuery,
  setDriveQuery,
  onImportFile,
  onRetry,
  projectId,
}) {
  return (
    <Modal
      isOpen={driveOpen}
      onClose={() => setDriveOpen(false)}
      className="drive-modal"
      subtitle="Google Drive"
      title="Import a document"
    >
      {!driveLoading && !driveError && driveFiles.length > 0 && (
        <SearchBar
          value={driveQuery}
          onChange={setDriveQuery}
          placeholder="Search Drive files"
          ariaLabel="Search Google Drive files"
          className="drive-search-bar"
          data-modal-initial-focus
        />
      )}
      <div className="drive-file-list">
        {driveLoading && <div className="drive-state">Loading your recent Drive files…</div>}
        {driveError && <div className="drive-state error"><strong>Could not load Drive</strong><span>{driveError}</span><div><button onClick={onRetry}>Try again</button>{driveError.includes('disabled or blocked') && <a href={`https://console.cloud.google.com/apis/library/drive.googleapis.com?project=${projectId}`} target="_blank" rel="noreferrer">Enable Drive API</a>}</div></div>}
        {!driveLoading && !driveError && !driveFiles.length && <div className="drive-state">No recent files found.</div>}
        {!driveLoading && !driveError && driveQuery && !filteredDriveFiles.length && <div className="drive-state">No files match “{driveQuery}”.</div>}
        {!driveLoading && !driveError && filteredDriveFiles.map((file) => (
          <button key={file.id} className="drive-file-item" onClick={() => onImportFile(file)}>
            <span><FileText size={17} /></span>
            <div><strong>{file.name}</strong><small>{file.mimeType.replace('application/vnd.google-apps.', 'Google ')}</small></div>
            <FolderInput size={16} />
          </button>
        ))}
      </div>
    </Modal>
  )
}
