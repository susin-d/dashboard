import { useEffect, useState } from 'react'
import {
  Bot,
  Loader,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Radio,
  Video,
} from 'lucide-react'
import { formatElapsed } from '../../utils/callDisplay'

const IN_PROGRESS_PHASES = ['dialing', 'connecting', 'active']

export function EveCallSection({ callCenter }) {
  const {
    phase = 'idle',
    muted = false,
    error,
    isEveCall = false,
    userTranscript = '',
    eveTranscript = '',
    isEveSpeaking = false,
    isEveThinking = false,
    ttsEnabled = true,
    sttStatus = 'listening',
    sttRecording = false,
    sttProvider = 'browser',
    startSttRecording,
    stopSttRecording,
    hangUp,
    toggleMute,
    toggleTts,
    sendVoiceToEve,
    requestEveCall,
  } = callCenter || {}

  const [elapsed, setElapsed] = useState(0)
  const [textDraft, setTextDraft] = useState('')

  useEffect(() => {
    if (phase !== 'active') {
      setElapsed(0)
      return undefined
    }
    const startedAt = Date.now()
    setElapsed(0)
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [phase])

  const inProgress = isEveCall && IN_PROGRESS_PHASES.includes(phase)

  const handleStartCall = (mode = 'audio') => {
    requestEveCall?.(mode)
  }

  const handleTextSend = (event) => {
    event.preventDefault()
    const text = textDraft.trim()
    if (!text || isEveThinking) return
    sendVoiceToEve?.(text)
    setTextDraft('')
  }

  let statusText = 'Ready to call'
  if (phase === 'dialing') statusText = 'Calling Eve…'
  else if (phase === 'connecting') statusText = 'Connecting…'
  else if (phase === 'active') {
    if (isEveThinking) statusText = 'Thinking…'
    else if (isEveSpeaking) statusText = 'Speaking…'
    else if (muted) statusText = 'Microphone muted'
    else if (sttStatus === 'unsupported') statusText = 'Voice input not supported in this browser'
    else if (sttStatus === 'permission') statusText = 'Microphone permission required'
    else if (sttStatus === 'error') statusText = 'Voice input unavailable'
    else if (sttProvider === 'groq') {
      statusText = sttRecording ? 'Listening to you…' : 'Hold to talk to Eve'
    } else {
      statusText = `Listening… (${formatElapsed(elapsed)})`
    }
  } else if (phase === 'declined') statusText = 'Call declined'
  else if (phase === 'missed') statusText = 'Call missed'
  else if (phase === 'ended') statusText = 'Call ended'
  else if (phase === 'error') statusText = 'Call failed'

  const showTextFallback = inProgress && sttStatus !== 'listening'

  return (
    <div className="eve-call-section-container">
      <div className="eve-call-card">
        {/* Top Header Badge */}
        <div className="eve-call-header">
          <div className="eve-call-status-pill">
            <span className={`eve-call-status-dot ${inProgress ? 'active' : ''}`} />
            <span>{inProgress ? `Live Session · ${formatElapsed(elapsed)}` : 'Voice Assistant'}</span>
          </div>
          <div className="eve-call-engine-badge">
            <Radio size={13} />
            <span>{sttProvider === 'groq' ? 'Groq Whisper STT' : 'Web Speech STT'}</span>
          </div>
        </div>

        {/* ── Central Animated Circle Visualizer ── */}
        <div className="eve-call-visualizer-area">
          <div
            className={`eve-call-circle-stage ${inProgress ? 'in-call' : 'idle'} ${
              isEveSpeaking ? 'speaking' : ''
            } ${isEveThinking ? 'thinking' : ''} ${!isEveSpeaking && !isEveThinking && inProgress && !muted ? 'listening' : ''}`}
          >
            {/* Concentric expanding circular wave rings */}
            <div className="eve-call-wave-circle wave-1" />
            <div className="eve-call-wave-circle wave-2" />
            <div className="eve-call-wave-circle wave-3" />
            <div className="eve-call-wave-circle wave-4" />
            <div className="eve-call-wave-circle wave-5" />

            {/* Central Circle Orb Core */}
            <div className="eve-call-orb-core">
              {isEveThinking ? (
                <Loader size={44} className="eve-call-spin-icon" />
              ) : isEveSpeaking ? (
                <Sparkles size={44} className="eve-call-speaking-icon" />
              ) : inProgress ? (
                <Bot size={44} className="eve-call-bot-icon" />
              ) : (
                <PhoneCall size={42} className="eve-call-idle-icon" />
              )}
            </div>
          </div>

          <div className="eve-call-title-group">
            <h2 className="eve-call-title">Eve AI Voice Assistant</h2>
            <p className="eve-call-subtitle">{statusText}</p>
            {error && <p className="eve-call-error-text">{error}</p>}
          </div>
        </div>

        {/* ── Live Transcripts / Captions ── */}
        {inProgress && (userTranscript || eveTranscript) && (
          <div className="eve-call-captions-drawer" role="log" aria-live="polite">
            {userTranscript && (
              <div className="eve-call-caption-row user">
                <span className="caption-tag">You</span>
                <p className="caption-body">{userTranscript}</p>
              </div>
            )}
            {eveTranscript && (
              <div className="eve-call-caption-row assistant">
                <span className="caption-tag">Eve</span>
                <p className="caption-body">{eveTranscript}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Optional Text Fallback Input during Call ── */}
        {showTextFallback && (
          <form className="eve-call-text-fallback" onSubmit={handleTextSend}>
            <input
              type="text"
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder="Type your response to Eve…"
              disabled={isEveThinking}
            />
            <button
              type="submit"
              disabled={isEveThinking || !textDraft.trim()}
              title="Send to Eve"
              aria-label="Send to Eve"
            >
              <Send size={15} />
            </button>
          </form>
        )}

        {/* ── Call Action Controls ── */}
        <div className="eve-call-controls-wrapper">
          {inProgress ? (
            <div className="eve-call-active-controls">
              {sttProvider === 'groq' && (
                <button
                  type="button"
                  className={`eve-call-ctrl-btn ${sttRecording ? 'active-talk' : ''}`}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    startSttRecording?.()
                  }}
                  onPointerUp={stopSttRecording}
                  onPointerLeave={stopSttRecording}
                  onPointerCancel={stopSttRecording}
                  disabled={muted}
                  title={sttRecording ? 'Release to send speech' : 'Hold to talk'}
                >
                  <Mic size={20} />
                  <span>{sttRecording ? 'Recording…' : 'Hold to talk'}</span>
                </button>
              )}

              <button
                type="button"
                className={`eve-call-ctrl-btn ${muted ? 'active-mute' : ''}`}
                onClick={toggleMute}
                title={muted ? 'Unmute microphone' : 'Mute microphone'}
                aria-pressed={muted}
              >
                {muted ? <MicOff size={20} /> : <Mic size={20} />}
                <span>{muted ? 'Muted' : 'Mute'}</span>
              </button>

              <button
                type="button"
                className={`eve-call-ctrl-btn ${!ttsEnabled ? 'active-mute' : ''}`}
                onClick={toggleTts}
                title={ttsEnabled ? 'Disable Eve voice response' : 'Enable Eve voice response'}
                aria-pressed={!ttsEnabled}
              >
                {ttsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                <span>{ttsEnabled ? 'Speaker' : 'Muted'}</span>
              </button>

              <button
                type="button"
                className="eve-call-hangup-btn"
                onClick={hangUp}
                title="End call session"
                aria-label="End call session"
              >
                <PhoneOff size={20} />
                <span>End Call</span>
              </button>
            </div>
          ) : (
            <div className="eve-call-idle-controls">
              <button
                type="button"
                className="eve-call-start-btn"
                onClick={() => handleStartCall('audio')}
              >
                <Phone size={18} />
                <span>Start Voice Call</span>
              </button>

              <button
                type="button"
                className="eve-call-start-btn secondary"
                onClick={() => handleStartCall('video')}
              >
                <Video size={18} />
                <span>Start Video Call</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
