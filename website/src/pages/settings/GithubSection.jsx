import { useEffect, useState } from 'react'
import { Check, GitFork } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui'
import {
  beginGithubOAuth,
  disconnectGithub,
  getGithubStatus,
} from '../../lib/githubApi'

export function GithubSection({ user }) {
  const [githubConnected, setGithubConnected] = useState(false)
  const [githubBusy, setGithubBusy] = useState(false)
  const [githubMessage, setGithubMessage] = useState('')
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  useEffect(() => {
    let active = true
    const searchParams = new URLSearchParams(window.location.search)
    const result = searchParams.get('github')
    const reason = searchParams.get('reason')
    if (result) {
      setGithubMessage(
        result === 'connected'
          ? 'GitHub connected successfully.'
          : `GitHub connection failed: ${reason || 'OAuth authorization failed'}`,
      )
      window.history.replaceState({}, '', window.location.pathname)
    }
    getGithubStatus()
      .then(({ connected }) => {
        if (active) setGithubConnected(connected)
      })
      .catch((error) => {
        if (active) setGithubMessage(error.message)
      })
    return () => {
      active = false
    }
  }, [user?.uid])

  const toggleGithub = async () => {
    setGithubBusy(true)
    setGithubMessage('')
    try {
      if (githubConnected) {
        await disconnectGithub()
        setGithubConnected(false)
        setGithubMessage('GitHub disconnected.')
      } else {
        await beginGithubOAuth()
      }
    } catch (error) {
      setGithubMessage(error.message)
      setGithubBusy(false)
    }
  }

  return (
    <>
      <section className="workspace-settings-card github-settings-card">
        <div className="workspace-settings-header">
          <div>
            <span className="workspace-google-mark"><GitFork size={19} /></span>
            <div>
              <h3>GitHub</h3>
              <p>Import repositories and live contribution stats</p>
            </div>
          </div>
          <button
            className={githubConnected ? 'workspace-connected' : ''}
            onClick={githubConnected ? () => setConfirmDisconnect(true) : toggleGithub}
            disabled={githubBusy}
          >
            {githubConnected && <Check size={15} />}
            {githubBusy
              ? 'Working…'
              : githubConnected
                ? 'Disconnect'
                : 'Connect'}
          </button>
        </div>
        <div className="github-settings-copy">
          <p>
            Connected repositories become StarWaves projects. GitHub activity
            replaces placeholder statistics.
          </p>
          {githubMessage && <strong role="status">{githubMessage}</strong>}
        </div>
      </section>

      <ConfirmDialog
        isOpen={confirmDisconnect}
        title="Disconnect integration?"
        message="Disconnect GitHub from StarWaves? You can reconnect it later."
        confirmLabel="Disconnect"
        onCancel={() => setConfirmDisconnect(false)}
        onConfirm={() => {
          setConfirmDisconnect(false)
          toggleGithub()
        }}
      />
    </>
  )
}
