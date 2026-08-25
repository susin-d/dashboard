import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { startPreview } from '../../lib/studioApi'

export function PreviewPane({ projectId, refreshKey, deviceMode = 'desktop' }) {
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
    <div className={`studio-preview studio-preview-${deviceMode}`}>
      {!hasBuildOutput && (
        <div className="studio-preview-dev-notice">
          <span>Run a build (e.g. <code>npm run build</code>) for full static output if needed.</span>
        </div>
      )}
      <div className="studio-preview-frame-container">
        <iframe
          key={`${previewUrl}-${refreshKey}`}
          src={previewUrl}
          title="App preview"
          sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
          className="studio-preview-frame"
        />
      </div>
    </div>
  )
}
