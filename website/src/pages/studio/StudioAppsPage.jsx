import { useState } from 'react'
import { AppWindow, ExternalLink, FileCode, Play, Plus, RefreshCw } from 'lucide-react'
import { EmptyState, LoadingState, PageHeader } from '../../components/ui'
import { startPreview } from '../../lib/studioApi'
import { useStudioProjects } from './useStudioProjects'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function StudioAppsPage({ onOpenProject, onNavigate }) {
  const { projects, isLoading, error, refresh } = useStudioProjects()
  const [runningId, setRunningId] = useState(null)
  const [runError, setRunError] = useState('')

  const builtApps = projects.filter((project) => project.build_status === 'ready')

  const handleRunApp = async (project) => {
    if (runningId) return
    setRunningId(project.id)
    setRunError('')
    try {
      const { preview_url: previewUrl } = await startPreview(project.id)
      window.open(previewUrl, '_blank', 'noopener')
    } catch (previewError) {
      setRunError(previewError.message || 'Could not start the app preview.')
    } finally {
      setRunningId(null)
    }
  }

  return (
    <div className="studio-page">
      <PageHeader
        title="Studio Apps"
        description="Apps Eve has finished building — jump back in or run them anytime."
        actions={
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onNavigate?.('studio')}
            >
              <Plus size={15} />
              New App
            </button>
            <button type="button" className="secondary-button" onClick={refresh}>
              <RefreshCw size={15} />
              Refresh
            </button>
          </>
        }
      />

      {(error || runError) && (
        <div className="studio-error-banner" role="alert">
          <span>{runError || error}</span>
          <button type="button" onClick={runError ? () => setRunError('') : refresh}>Retry</button>
        </div>
      )}

      {isLoading ? (
        <LoadingState message="Loading your apps…" />
      ) : builtApps.length === 0 ? (
        <EmptyState
          icon={AppWindow}
          title="No finished apps yet"
          description='Ask Eve to build one — try "Build a habit tracker app" in Studio.'
        />
      ) : (
        <div className="studio-project-grid">
          {builtApps.map((project) => (
            <article key={project.id} className="studio-project-card">
              <div className="studio-project-card-icon" aria-hidden="true">
                <AppWindow size={22} />
              </div>
              <div className="studio-project-card-body">
                <h3 className="studio-project-card-title">{project.name}</h3>
                {project.description && (
                  <p className="studio-project-card-desc">{project.description}</p>
                )}
                <div className="studio-project-card-meta">
                  {project.stack && <span className="studio-stack-tag">{project.stack}</span>}
                  <span className="studio-file-count">
                    <FileCode size={12} /> {project.file_count} files
                  </span>
                  <span className="studio-file-count">Updated {formatDate(project.updated_at)}</span>
                </div>
              </div>
              <div className="studio-project-card-actions">
                <button
                  type="button"
                  className="primary-button studio-open-btn"
                  onClick={() => onOpenProject?.(project)}
                >
                  <Play size={14} />
                  Open Builder
                </button>
                <button
                  type="button"
                  className="secondary-button studio-open-btn"
                  onClick={() => handleRunApp(project)}
                  disabled={runningId === project.id}
                >
                  <ExternalLink size={14} />
                  {runningId === project.id ? 'Starting…' : 'Run App'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
