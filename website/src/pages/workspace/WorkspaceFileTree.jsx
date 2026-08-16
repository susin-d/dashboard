import { useState, useMemo } from 'react'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
} from 'lucide-react'

function buildTree(flatFiles) {
  const root = { children: {} }
  for (const file of flatFiles) {
    const parts = file.path.split('/')
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDirectory: i < parts.length - 1 || file.is_directory,
          size: file.size,
          children: {},
        }
      }
      current = current.children[part]
    }
  }
  return root.children
}

function sortEntries(entries) {
  return Object.values(entries).sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function TreeNode({ node, activeFile, onFileSelect, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 1)
  const children = useMemo(() => sortEntries(node.children || {}), [node.children])
  const hasChildren = children.length > 0
  const isActive = activeFile === node.path

  if (node.isDirectory) {
    return (
      <div className="tree-node">
        <button
          className={`tree-item tree-directory${expanded ? ' expanded' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {expanded ? <FolderOpen size={14} /> : <Folder size={14} />}
          <span className="tree-item-name">{node.name}</span>
        </button>
        {expanded && hasChildren && (
          <div className="tree-children">
            {children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                activeFile={activeFile}
                onFileSelect={onFileSelect}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="tree-node">
      <button
        className={`tree-item tree-file${isActive ? ' active' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onFileSelect(node.path)}
      >
        <File size={14} />
        <span className="tree-item-name">{node.name}</span>
      </button>
    </div>
  )
}

export function WorkspaceFileTree({
  files,
  activeFile,
  onFileSelect,
  onCreateFile,
}) {
  const tree = useMemo(() => buildTree(files), [files])
  const sorted = useMemo(() => sortEntries(tree), [tree])

  return (
    <div className="workspace-file-tree">
      <div className="file-tree-header">
        <span className="file-tree-title">Explorer</span>
        <button
          className="file-tree-action"
          onClick={onCreateFile}
          title="New file"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="file-tree-content">
        {sorted.length === 0 ? (
          <div className="file-tree-empty">No files yet</div>
        ) : (
          sorted.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}
