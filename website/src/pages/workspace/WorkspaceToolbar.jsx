import { useEffect, useRef, useState } from 'react'
import {
  FolderOpen,
  RefreshCw,
  Cloud,
  Monitor,
  Terminal,
  ChevronDown,
  Plus,
  Trash2,
  Check,
  Edit2,
} from 'lucide-react'

export function WorkspaceToolbar({
  workspaces = [],
  activeWorkspace,
  onSwitchWorkspace,
  onOpenCreateWorkspace,
  onOpenRenameWorkspace,
  onOpenDeleteWorkspace,
  isTauri,
  loading,
  onRefresh,
  terminalVisible,
  onToggleTerminal,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className="workspace-toolbar">
      <div className="workspace-toolbar-left">
        <div className="workspace-selector-container" ref={dropdownRef}>
          <button
            type="button"
            className="workspace-selector-trigger"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
            title="Switch workspace"
          >
            <FolderOpen size={17} />
            <span className="workspace-name">{activeWorkspace?.name || 'Default Workspace'}</span>
            <ChevronDown size={14} className={`chevron-icon ${dropdownOpen ? 'open' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="workspace-selector-menu" role="menu">
              <div className="workspace-menu-header">
                <span>Workspaces</span>
                <button
                  type="button"
                  className="workspace-menu-add-btn"
                  onClick={() => {
                    setDropdownOpen(false)
                    onOpenCreateWorkspace()
                  }}
                  title="Create new workspace"
                >
                  <Plus size={14} />
                  <span>New</span>
                </button>
              </div>

              <div className="workspace-menu-list">
                {workspaces.map((ws) => {
                  const isActive = ws.id === activeWorkspace?.id
                  return (
                    <div
                      key={ws.id}
                      className={`workspace-menu-item ${isActive ? 'active' : ''}`}
                    >
                      <button
                        type="button"
                        className="workspace-menu-item-select"
                        onClick={() => {
                          onSwitchWorkspace(ws.id)
                          setDropdownOpen(false)
                        }}
                      >
                        <div className="workspace-menu-item-info">
                          <span className="workspace-item-title">{ws.name}</span>
                          <span className="workspace-item-count">
                            {ws.file_count ?? 0} {ws.file_count === 1 ? 'file' : 'files'}
                          </span>
                        </div>
                        {isActive && <Check size={14} className="workspace-active-check" />}
                      </button>

                      <div className="workspace-menu-item-actions">
                        <button
                          type="button"
                          className="workspace-item-action-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDropdownOpen(false)
                            onOpenRenameWorkspace(ws)
                          }}
                          title="Rename workspace"
                        >
                          <Edit2 size={13} />
                        </button>
                        {workspaces.length > 1 && (
                          <button
                            type="button"
                            className="workspace-item-action-btn delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDropdownOpen(false)
                              onOpenDeleteWorkspace(ws)
                            }}
                            title="Delete workspace"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
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
          onClick={() => onRefresh()}
          disabled={loading}
          title="Refresh file tree"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>
    </div>
  )
}

