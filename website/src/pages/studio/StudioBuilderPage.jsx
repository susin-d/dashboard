import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  LayoutGrid,
  LayoutTemplate,
  Maximize2,
  Minimize2,
  RefreshCw,
  Share2,
  Terminal,
} from 'lucide-react'
import { LoadingState } from '../../components/ui'
import { WorkspaceEditor } from '../workspace/WorkspaceEditor'
import { WorkspaceFileTree } from '../workspace/WorkspaceFileTree'
import {
  getStudioProject,
  publishStudioTemplate,
  startPreview,
} from '../../lib/studioApi'
import { BuilderChat } from './BuilderChat'
import { CommandConsole } from './CommandConsole'
import { PlanApprovalCard } from './PlanApprovalCard'
import { PreviewPane } from './PreviewPane'
import { useStudioFiles } from './useStudioFiles'

export function StudioBuilderPage({ projectId, onBack }) {
  const [project, setProject] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [centerTab, setCenterTab] = useState('preview')
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0)
  const [consoleVisible, setConsoleVisible] = useState(false)
  const [publishMessage, setPublishMessage] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const files = useStudioFiles(projectId)

  const loadProject = useCallback(async () => {
    if (!projectId) return
    try {
      setProject(await getStudioProject(projectId))
      setError('')
    } catch (loadError) {
      setError(loadError.message || 'Could not load this Studio project.')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    setIsLoading(true)
    loadProject()
  }, [loadProject])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        if (files.activeTab) files.saveFile(files.activeTab)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [files])

  const handleActions = useCallback(
    (actions) => {
      if (!Array.isArray(actions)) return
      actions.forEach((action) => {
        if (action.type === 'show_build_approval' || action.type === 'open_studio_project') {
          loadProject()
        }
      })
    },
    [loadProject],
  )

  const handlePlanResolved = async () => {
    await loadProject()
    setPreviewRefreshKey((key) => key + 1)
  }

  const handleCommandFinished = async () => {
    await files.refreshTree()
    setPreviewRefreshKey((key) => key + 1)
  }

  const handlePublishTemplate = async () => {
    try {
      const result = await publishStudioTemplate(projectId)
      setPublishMessage(result.detail || 'Published as template.')
      setTimeout(() => setPublishMessage(''), 4000)
    } catch (publishError) {
      setPublishMessage(publishError.message || 'Could not publish template.')
      setTimeout(() => setPublishMessage(''), 4000)
    }
  }

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2500)
      }
    } catch {
      // ignore
    }
  }

  const handleOpenExternal = async () => {
    try {
      const result = await startPreview(projectId)
      if (result.preview_url) {
        window.open(result.preview_url, '_blank', 'noopener,noreferrer')
      }
    } catch {
      // ignore
    }
  }

  if (isLoading) return <LoadingState message="Loading Studio…" />
  if (error || !project) {
    return (
      <div className="studio-page">
        <div className="studio-error-banner" role="alert">
          <span>{error || 'Project not found.'}</span>
          <button type="button" onClick={onBack}>Back to Studio</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`studio-builder aistudio-container ${isFullscreen ? 'aistudio-fullscreen' : ''}`}>
      {/* ── Top Navbar (AI Studio style) ── */}
      <header className="aistudio-navbar">
        <div className="aistudio-nav-left">
          <button
            type="button"
            className="aistudio-back-btn"
            onClick={onBack}
            aria-label="Back to start"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Back to start</span>
          </button>
        </div>

        <div className="aistudio-nav-center">
          <h1 className="aistudio-project-name">{project.name}</h1>
        </div>

        <div className="aistudio-nav-right">
          {publishMessage && (
            <span className="aistudio-nav-msg" role="status">{publishMessage}</span>
          )}
          <button
            type="button"
            className="aistudio-action-btn"
            onClick={handlePublishTemplate}
            title="Publish as reusable starter template"
          >
            <Copy size={13} aria-hidden="true" />
            <span>Remix</span>
          </button>
          <button
            type="button"
            className="aistudio-action-btn"
            onClick={handleShare}
            title="Share project link"
          >
            <Share2 size={13} aria-hidden="true" />
            <span>{shareCopied ? 'Copied!' : 'Share'}</span>
          </button>
          <button
            type="button"
            className="aistudio-publish-pill"
            onClick={handlePublishTemplate}
          >
            <LayoutTemplate size={13} aria-hidden="true" />
            <span>Publish</span>
          </button>
          <button
            type="button"
            className={`aistudio-icon-toggle ${consoleVisible ? 'active' : ''}`}
            onClick={() => setConsoleVisible((v) => !v)}
            title="Toggle Console / Terminal"
            aria-label="Toggle Console"
            aria-pressed={consoleVisible}
          >
            <Terminal size={15} />
          </button>
        </div>
      </header>

      {/* ── Main 2-Column Workspace (AI Studio Layout) ── */}
      <div className="aistudio-body">
        {/* Left Column: AI Assistant Chat & Planning */}
        <aside className="aistudio-chat-col">
          {project.plan_status === 'proposed' && project.plan && (
            <div className="aistudio-plan-wrap">
              <PlanApprovalCard
                projectId={projectId}
                plan={project.plan}
                onResolved={handlePlanResolved}
              />
            </div>
          )}
          <BuilderChat
            projectId={projectId}
            projectName={project.name}
            onActions={handleActions}
          />
        </aside>

        {/* Right Column: Stage (Preview or Code Editor) */}
        <section className="aistudio-stage-col">
          {/* Stage Top Bar */}
          <div className="aistudio-stage-bar">
            <div className="aistudio-segmented-tabs" role="tablist" aria-label="View mode">
              <button
                type="button"
                role="tab"
                aria-selected={centerTab === 'preview'}
                className={`aistudio-tab-btn ${centerTab === 'preview' ? 'active' : ''}`}
                onClick={() => setCenterTab('preview')}
              >
                Preview
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={centerTab === 'code'}
                className={`aistudio-tab-btn ${centerTab === 'code' ? 'active' : ''}`}
                onClick={() => setCenterTab('code')}
              >
                Code
              </button>
            </div>

            <div className="aistudio-route-bar" title="App Root">
              <LayoutGrid size={13} aria-hidden="true" />
              <span>/</span>
            </div>

            <div className="aistudio-stage-actions">
              <button
                type="button"
                className="aistudio-stage-icon-btn"
                onClick={() => setPreviewRefreshKey((k) => k + 1)}
                title="Reload preview"
                aria-label="Reload preview"
              >
                <RefreshCw size={13} />
              </button>
              <button
                type="button"
                className="aistudio-stage-icon-btn"
                onClick={handleOpenExternal}
                title="Open in new tab"
                aria-label="Open in new tab"
              >
                <ExternalLink size={13} />
              </button>
              <button
                type="button"
                className="aistudio-stage-icon-btn"
                onClick={() => setIsFullscreen((f) => !f)}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                aria-label="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </div>
          </div>

          {/* Stage Canvas */}
          <div className="aistudio-stage-canvas">
            {centerTab === 'preview' ? (
              <PreviewPane projectId={projectId} refreshKey={previewRefreshKey} />
            ) : (
              <div className="aistudio-code-layout">
                <aside className="aistudio-code-explorer">
                  <WorkspaceFileTree
                    files={files.fileTree}
                    activeFile={files.activeTab}
                    onFileSelect={files.openFile}
                    onCreateFile={files.createFile}
                  />
                </aside>
                <main className="aistudio-code-editor">
                  <WorkspaceEditor
                    tabs={files.openTabs}
                    activeTab={files.activeTab}
                    onTabSelect={files.setActiveTab}
                    onTabClose={files.closeTab}
                    onContentChange={files.updateTabContent}
                    onSave={files.saveFile}
                    isFileDirty={files.isFileDirty}
                  />
                </main>
              </div>
            )}
          </div>

          {/* Bottom Console Drawer */}
          {consoleVisible && (
            <div className="aistudio-console-drawer">
              <CommandConsole
                projectId={projectId}
                onCommandFinished={handleCommandFinished}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
