import { useCallback, useEffect, useState } from 'react'
import { GitBranch, GitCommitHorizontal, Link2, Upload } from 'lucide-react'
import { gitCommit, gitConnectGithub, gitPushGithub, gitStatus } from '../../lib/studioApi'

export function GitPanel({ projectId, refreshKey }) {
  const [status, setStatus] = useState(null)
  const [repoUrl, setRepoUrl] = useState('')
  const [commitMessage, setCommitMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await gitStatus(projectId))
    } catch (statusError) {
      setError(statusError.message || 'Could not load git status.')
    }
  }, [projectId])

  useEffect(() => {
    loadStatus()
  }, [loadStatus, refreshKey])

  useEffect(() => {
    if (status?.remote_url) setRepoUrl(status.remote_url)
  }, [status?.remote_url])

  const runAction = async (action) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await action()
      setMessage(result.detail || 'Done.')
      await loadStatus()
    } catch (actionError) {
      setError(actionError.message || 'Git action failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="studio-git-panel" aria-label="Git and GitHub">
      <header className="studio-git-header">
        <GitBranch size={14} />
        <span>{status?.initialized ? status.branch || 'main' : 'git unavailable'}</span>
        {status?.changed_files?.length > 0 && (
          <span className="studio-git-changes">{status.changed_files.length} changed</span>
        )}
        {status?.ahead > 0 && <span className="studio-git-changes">{status.ahead} ahead</span>}
      </header>

      <div className="studio-git-connect">
        <input
          type="url"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/you/repo.git"
          aria-label="GitHub repository URL"
        />
        <button
          type="button"
          className="secondary-button"
          disabled={!repoUrl.trim() || busy}
          onClick={() => runAction(() => gitConnectGithub(projectId, repoUrl.trim()))}
        >
          <Link2 size={13} />
          Connect
        </button>
      </div>

      <div className="studio-git-commit-row">
        <input
          type="text"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message"
          aria-label="Commit message"
        />
        <button
          type="button"
          className="secondary-button"
          disabled={!commitMessage.trim() || busy}
          onClick={() =>
            runAction(async () => {
              const result = await gitCommit(projectId, commitMessage.trim())
              setCommitMessage('')
              return result
            })
          }
        >
          <GitCommitHorizontal size={13} />
          Commit
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={!status?.remote_url || busy}
          title={status?.remote_url ? 'Push to GitHub' : 'Connect a repo first'}
          onClick={() => runAction(() => gitPushGithub(projectId))}
        >
          <Upload size={13} />
          Push
        </button>
      </div>

      {message && <p className="studio-git-message">{message}</p>}
      {error && <p className="studio-form-error" role="alert">{error}</p>}
    </section>
  )
}
