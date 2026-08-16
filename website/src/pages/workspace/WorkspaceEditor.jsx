import { useCallback, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { X } from 'lucide-react'

const EXTENSION_LANGUAGE_MAP = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  rb: 'ruby',
  php: 'php',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  css: 'css',
  html: 'html',
  xml: 'xml',
  json: 'json',
  md: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  sql: 'sql',
  sh: 'shell',
  bat: 'bat',
  ps1: 'powershell',
  dockerfile: 'dockerfile',
  gitignore: 'plaintext',
  sdignore: 'plaintext',
  env: 'plaintext',
  txt: 'plaintext',
}

function getLanguage(filePath) {
  const name = filePath.split('/').pop().toLowerCase()
  if (name === 'dockerfile') return 'dockerfile'
  const ext = name.split('.').pop()
  return EXTENSION_LANGUAGE_MAP[ext] || 'plaintext'
}

function getTheme() {
  return document.documentElement.classList.contains('dark-theme')
    ? 'vs-dark'
    : 'vs'
}

export function WorkspaceEditor({
  tabs,
  activeTab,
  onTabSelect,
  onTabClose,
  onContentChange,
  onSave,
  isFileDirty,
}) {
  const editorRef = useRef(null)

  const handleMount = useCallback((editor) => {
    editorRef.current = editor
    editor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [2048 | 49], // Ctrl+S
      run: () => onSave(activeTab),
    })
  }, [onSave, activeTab])

  const activeTabData = tabs.find((tab) => tab.path === activeTab)

  if (tabs.length === 0) {
    return (
      <div className="workspace-editor">
        <div className="workspace-editor-empty">
          <p>Select a file from the explorer to start editing</p>
        </div>
      </div>
    )
  }

  return (
    <div className="workspace-editor">
      <div className="workspace-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            className={`workspace-tab${tab.path === activeTab ? ' active' : ''}`}
            onClick={() => onTabSelect(tab.path)}
          >
            <span className="workspace-tab-name">
              {isFileDirty(tab.path) && <span className="workspace-tab-dot" />}
              {tab.name}
            </span>
            <span
              className="workspace-tab-close"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onTabClose(tab.path)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  onTabClose(tab.path)
                }
              }}
            >
              <X size={12} />
            </span>
          </button>
        ))}
      </div>
      {activeTabData && (
        <Editor
          key={activeTab}
          height="100%"
          language={getLanguage(activeTab)}
          value={activeTabData.content}
          theme={getTheme()}
          onChange={(value) => onContentChange(activeTab, value ?? '')}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            renderWhitespace: 'selection',
          }}
        />
      )}
    </div>
  )
}
