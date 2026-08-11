import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader, Phone, RefreshCw, Video } from 'lucide-react'
import { CallScreen } from '../components/calls/CallScreen'
import { getRecentCalls } from '../lib/callsApi'
import {
  callStatusLabel,
  callTimeAgo,
  otherParticipant,
  participantInitials,
  participantName,
} from '../utils/callDisplay'

const ACTIVE_CALL_PHASES = [
  'dialing',
  'connecting',
  'active',
  'declined',
  'ended',
  'missed',
  'error',
]

export function CallsPage({ callCenter, user }) {
  const myUid = user?.uid
  const { phase, dial } = callCenter
  const [calleeIdentifier, setCalleeIdentifier] = useState('')
  const [mode, setMode] = useState('video')
  const [recent, setRecent] = useState([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [recentError, setRecentError] = useState('')

  const loadRecent = useCallback(() => {
    setLoadingRecent(true)
    setRecentError('')
    getRecentCalls()
      .then((calls) => setRecent(calls || []))
      .catch((err) => setRecentError(err.message || 'Could not load recent calls.'))
      .finally(() => setLoadingRecent(false))
  }, [])

  useEffect(() => {
    loadRecent()
  }, [loadRecent, phase])

  const handleStartCall = (e) => {
    e?.preventDefault()
    const identifier = calleeIdentifier.trim()
    if (!identifier) return
    dial(identifier, mode)
  }

  const callBack = (targetIdentifier, callMode) => {
    if (!targetIdentifier) return
    dial(targetIdentifier, callMode)
  }

  const inCall = ACTIVE_CALL_PHASES.includes(phase)

  return (
    <section className="calls-page">
      <div className="page-heading">
        <div>
          <p>Communication</p>
          <h1>Calls</h1>
        </div>
        <div className="page-heading-actions">
          <button
            className="icon-button"
            onClick={loadRecent}
            disabled={loadingRecent}
            title="Refresh recent calls"
          >
            <RefreshCw size={16} className={loadingRecent ? 'calls-spin' : ''} />
          </button>
        </div>
      </div>

      {inCall && (
        <div className="calls-session-panel">
          <CallScreen callCenter={callCenter} myUid={myUid} />
        </div>
      )}

      <div className="calls-layout">
        <div className="calls-dialer-card">
          <div className="calls-dialer-header">
            <h2>Start a call</h2>
            <p>Call another StarWaves user by email or user id.</p>
          </div>

          <div className="calls-mode-toggle" role="group" aria-label="Call type">
            <button
              type="button"
              className={`calls-mode-option ${mode === 'audio' ? 'active' : ''}`}
              onClick={() => setMode('audio')}
              aria-pressed={mode === 'audio'}
            >
              <Phone size={16} />
              <span>Voice</span>
            </button>
            <button
              type="button"
              className={`calls-mode-option ${mode === 'video' ? 'active' : ''}`}
              onClick={() => setMode('video')}
              aria-pressed={mode === 'video'}
            >
              <Video size={16} />
              <span>Video</span>
            </button>
          </div>

          <form className="calls-dialer-form" onSubmit={handleStartCall}>
            <label className="input-label" htmlFor="caller-identifier">
              Recipient
            </label>
            <input
              id="caller-identifier"
              type="text"
              className="form-input"
              placeholder="name@example.com"
              value={calleeIdentifier}
              onChange={(e) => setCalleeIdentifier(e.target.value)}
              autoComplete="email"
            />
            <button
              type="submit"
              className="primary-button calls-dial-button"
              disabled={!calleeIdentifier.trim() || phase === 'dialing' || phase === 'connecting'}
            >
              {phase === 'dialing' || phase === 'connecting' ? (
                <Loader size={16} className="calls-spin" />
              ) : mode === 'video' ? (
                <Video size={16} />
              ) : (
                <Phone size={16} />
              )}
              <span>{mode === 'video' ? 'Start video call' : 'Start voice call'}</span>
            </button>
          </form>
        </div>

        <div className="calls-recent-card">
          <div className="calls-recent-header">
            <h2>Recent calls</h2>
          </div>

          {recentError && (
            <div className="calls-recent-error" role="alert">
              <AlertCircle size={16} />
              <span>{recentError}</span>
            </div>
          )}

          {loadingRecent ? (
            <div className="calls-recent-empty">
              <Loader size={22} className="calls-spin" />
              <p>Loading recent calls…</p>
            </div>
          ) : recent.length === 0 ? (
            <div className="calls-recent-empty">
              <Phone size={28} />
              <p>No calls yet. Dial a StarWaves user to get started.</p>
            </div>
          ) : (
            <ul className="calls-recent-list">
              {recent.map((call) => {
                const other = otherParticipant(call, myUid)
                const otherIdentifier = other?.email || other?.uid
                const isOther = call.caller?.uid === myUid ? 'Outgoing' : 'Incoming'
                return (
                  <li key={call.id} className="calls-recent-item">
                    <span className="calls-recent-avatar" aria-hidden="true">
                      {participantInitials(other)}
                    </span>
                    <span className="calls-recent-info">
                      <span className="calls-recent-name">{participantName(other)}</span>
                      <span className="calls-recent-meta">
                        <span className={`calls-recent-direction ${isOther === 'Incoming' ? 'incoming' : ''}`}>
                          {isOther}
                        </span>
                        · {callStatusLabel(call.status)} · {callTimeAgo(call.updated_at || call.created_at)}
                      </span>
                    </span>
                    <span className="calls-recent-actions">
                      <button
                        type="button"
                        className="icon-button"
                        title="Call again (voice)"
                        onClick={() => callBack(otherIdentifier, 'audio')}
                        disabled={!otherIdentifier}
                      >
                        <Phone size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title="Call again (video)"
                        onClick={() => callBack(otherIdentifier, 'video')}
                        disabled={!otherIdentifier}
                      >
                        <Video size={16} />
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}