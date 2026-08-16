import { FolderOpen, RefreshCw, Cloud, Monitor, Terminal } from 'lucide-react'

export function WorkspaceToolbar({ isTauri, loading, onRefresh, terminalVisible, onToggleTerminal }) {
  return (
    <div className="workspace-toolbar">
      <div className="workspace-toolbar-left">
        <FolderOpen size={18} />
        <span className="workspace-toolbar-title">Workspace</span>
      </div>
      <div className="workspace-toolbar-right">
        <span className="workspace-toolbar-badge">
          {isTauri ? <Monitor size={14} /> : <Cloud size={14} />}
          <span>{isTauri ? 'Local' : 'Cloud'}</span>
        </span>
        <button
          className={`workspace-toolbar-btn${terminalVisible ? ' active' : ''}`}
          onClick={onToggleTerminal}
          title="Toggle Terminal"
        >
          <Terminal size={16} />
        </button>
        <button
          className="workspace-toolbar-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh file tree"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>
    </div>
  )
}
