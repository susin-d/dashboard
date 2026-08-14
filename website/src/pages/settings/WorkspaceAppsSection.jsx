import { useEffect, useState } from 'react'
import { Check, ExternalLink, FileText, HardDrive, Plus, Presentation, Sheet } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui'
import {
  beginGoogleDriveOAuth,
  disconnectGoogleDrive,
  getGoogleDriveStatus,
} from '../../lib/googleDriveApi'

const workspaceApps = [
  {
    id: 'drive',
    name: 'Google Drive',
    description: 'Upload and import your files.',
    url: 'https://drive.google.com',
    icon: HardDrive,
  },
  {
    id: 'docs',
    name: 'Google Docs',
    description: 'Create and manage documents.',
    url: 'https://docs.google.com',
    icon: FileText,
  },
  {
    id: 'sheets',
    name: 'Google Sheets',
    description: 'Open your spreadsheets.',
    url: 'https://sheets.google.com',
    icon: Sheet,
  },
  {
    id: 'slides',
    name: 'Google Slides',
    description: 'Open your presentations.',
    url: 'https://slides.google.com',
    icon: Presentation,
  },
]

export function WorkspaceAppsSection() {
  const [workspaceConnected, setWorkspaceConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  useEffect(() => {
    let active = true
    const searchParams = new URLSearchParams(window.location.search)
    const result = searchParams.get('drive')
    const reason = searchParams.get('reason')
    if (result === 'error') {
      setConnectionError(`Google Drive connection failed: ${reason || 'OAuth authorization failed'}`)
    }
    if (result) {
      window.history.replaceState({}, '', window.location.pathname)
    }
    getGoogleDriveStatus()
      .then(({ connected }) => {
        if (active) setWorkspaceConnected(connected)
      })
      .catch((error) => {
        if (active) setConnectionError(error.message)
      })
    return () => {
      active = false
    }
  }, [])

  const connectWorkspace = async () => {
    setConnecting(true)
    setConnectionError('')
    try {
      if (workspaceConnected) {
        await disconnectGoogleDrive()
        setWorkspaceConnected(false)
      } else {
        await beginGoogleDriveOAuth()
        const { connected } = await getGoogleDriveStatus()
        setWorkspaceConnected(connected)
      }
    } catch (error) {
      setConnectionError(error.message || 'Google Workspace could not be connected.')
    } finally {
      setConnecting(false)
    }
  }

  const addWorkspaceAccount = async () => {
    setConnecting(true)
    setConnectionError('')
    try {
      await beginGoogleDriveOAuth()
      const { connected } = await getGoogleDriveStatus()
      setWorkspaceConnected(connected)
    } catch (error) {
      setConnectionError(error.message || 'Google Workspace account could not be connected.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <>
      <section className="workspace-settings-card">
        <div className="workspace-settings-header">
          <div>
            <span className="workspace-google-mark">G</span>
            <div>
              <h3>Google Workspace</h3>
              <p>Drive, Docs, Sheets, and Slides</p>
            </div>
          </div>
          <button
            className={workspaceConnected ? 'workspace-connected' : ''}
            onClick={workspaceConnected ? () => setConfirmDisconnect(true) : connectWorkspace}
            disabled={connecting}
          >
            {workspaceConnected && <Check size={15} />}
            {connecting
              ? 'Connecting…'
              : workspaceConnected
                ? 'Disconnect'
                : 'Connect'}
          </button>
        </div>

        {connectionError && (
          <p className="workspace-connection-error" role="alert">
            {connectionError}
          </p>
        )}

        <div className="workspace-app-list">
          {workspaceApps.map((app) => {
            const Icon = app.icon
            return (
              <a
                href={app.url}
                target="_blank"
                rel="noreferrer"
                key={app.id}
              >
                <span><Icon size={17} /></span>
                <div>
                  <strong>{app.name}</strong>
                  <small>{app.description}</small>
                </div>
                <ExternalLink size={15} />
              </a>
            )
          })}
        </div>
        {workspaceConnected && (
          <button
            className="google-calendar-add-account workspace-add-account"
            onClick={addWorkspaceAccount}
            disabled={connecting}
          >
            {connecting ? 'Connecting…' : (
              <>
                <Plus size={14} />
                Add another account
              </>
            )}
          </button>
        )}
      </section>

      <ConfirmDialog
        isOpen={confirmDisconnect}
        title="Disconnect integration?"
        message="Disconnect Google Workspace from StarWaves? You can reconnect it later."
        confirmLabel="Disconnect"
        onCancel={() => setConfirmDisconnect(false)}
        onConfirm={() => {
          setConfirmDisconnect(false)
          connectWorkspace()
        }}
      />
    </>
  )
}
