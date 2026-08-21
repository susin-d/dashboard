import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { startPreview } from '../../lib/studioApi'

export function PreviewPane({ projectId, refreshKey }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [hasBuildOutput, setHasBuildOutput] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadPreview = useCallback(async () => {
    if (!projectId) return
    setIsLoading(true)
    setError('')
    try {
      const result = await startPreview(projectId)
      setPreviewUrl(result.preview_url)
      setHasBuildOutput(result.has_build_output)
    } catch (previewError) {
      setError(previewError.message || 'Could not start the preview.')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadPreview()
  }, [loadPreview, refreshKey])

  if (error) {
    return (
      <div className="studio-preview-empty">
        <p role="alert">{error}</p>
        <button type="button" className="secondary-button" onClick={loadPreview}>
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    )
  }

  if (!previewUrl) {
    return (
      <div className="studio-preview-empty">
        {isLoading ? <p>Preparing preview…</p> : <p>No preview available yet.</p>}
      </div>
    )
  }

  return (
    <div className="studio-preview">
      <div className="studio-preview-bar">
        {!hasBuildOutput && (
          <span className="studio-preview-hint">
            No build output found — run a build (e.g. <code>npm run build</code>) for the full app.
          </span>
        )}
        <div className="studio-preview-actions">
          <button type="button" className="icon-button" onClick={loadPreview} aria-label="Reload preview" title="Reload preview">
            <RefreshCw size={14} />
          </button>
          <a
            className="icon-button"
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open preview in new tab"
            title="Open in new tab"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
      <iframe
        key={`${previewUrl}-${refreshKey}`}
        src={previewUrl}
        title="App preview"
        sandbox="allow-scripts allow-forms allow-popups"
        className="studio-preview-frame"
      />
    </div>
  )
}
