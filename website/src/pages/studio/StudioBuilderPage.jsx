import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, LayoutTemplate } from 'lucide-react'
import { LoadingState } from '../../components/ui'
import { WorkspaceEditor } from '../workspace/WorkspaceEditor'
import { WorkspaceFileTree } from '../workspace/WorkspaceFileTree'
import {
  getStudioProject,
  publishStudioTemplate,
} from '../../lib/studioApi'
import { BuilderChat } from './BuilderChat'
import { CommandConsole } from './CommandConsole'
import { GitPanel } from './GitPanel'
import { PlanApprovalCard } from './PlanApprovalCard'
import { PreviewPane } from './PreviewPane'
import { useStudioFiles } from './useStudioFiles'
import { BUILDER_CENTER_TABS, buildStatusLabel, planStatusLabel } from './studioConstants'

export function StudioBuilderPage({ projectId, onBack }) {
  const [project, setProject] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [centerTab, setCenterTab] = useState('code')
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0)
  const [consoleVisible, setConsoleVisible] = useState(true)
  const [publishMessage, setPublishMessage] = useState('')

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
    } catch (publishError) {
      setPublishMessage(publishError.message || 'Could not publish template.')
    }
  }

  if (isLoading) return <LoadingState message="Loading builder…" />
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
    <div className="studio-builder">
      <header className="studio-builder-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Back to Studio projects">
          <ArrowLeft size={16} />
        </button>
        <div className="studio-builder-title">
          <h1>{project.name}</h1>
          <span className="studio-builder-status">
            {buildStatusLabel(project.build_status)} · {planStatusLabel(project.plan_status)}
          </span>
        </div>
        <div className="studio-builder-header-actions">
          <button type="button" className="secondary-button" onClick={handlePublishTemplate}>
            <LayoutTemplate size={14} />
            Publish as Template
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setConsoleVisible((visible) => !visible)}
            aria-pressed={consoleVisible}
          >
            Console
          </button>
        </div>
      </header>

      {publishMessage && (
        <p className="studio-git-message" role="status">{publishMessage}</p>
      )}

      <div className="studio-builder-layout">
        <aside className="studio-builder-left">
          <WorkspaceFileTree
            files={files.fileTree}
            activeFile={files.activeTab}
            onFileSelect={files.openFile}
            onCreateFile={files.createFile}
          />
          <GitPanel projectId={projectId} refreshKey={previewRefreshKey} />
        </aside>

        <section className="studio-builder-center">
          <div className="studio-center-tabs" role="tablist" aria-label="Code or preview">
            {BUILDER_CENTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={centerTab === tab.id}
                className={`studio-center-tab ${centerTab === tab.id ? 'active' : ''}`}
                onClick={() => setCenterTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {centerTab === 'code' ? (
            <div className="studio-editor-wrap">
              <WorkspaceEditor
                tabs={files.openTabs}
                activeTab={files.activeTab}
                onTabSelect={files.setActiveTab}
                onTabClose={files.closeTab}
                onContentChange={files.updateTabContent}
                onSave={files.saveFile}
                isFileDirty={files.isFileDirty}
              />
            </div>
          ) : (
            <PreviewPane projectId={projectId} refreshKey={previewRefreshKey} />
          )}

          {consoleVisible && (
            <CommandConsole projectId={projectId} onCommandFinished={handleCommandFinished} />
          )}
        </section>

        <aside className="studio-builder-right">
          {project.plan_status === 'proposed' && project.plan && (
            <PlanApprovalCard
              projectId={projectId}
              plan={project.plan}
              onResolved={handlePlanResolved}
            />
          )}
          <BuilderChat
            projectId={projectId}
            projectName={project.name}
            onActions={handleActions}
          />
        </aside>
      </div>
    </div>
  )
}
