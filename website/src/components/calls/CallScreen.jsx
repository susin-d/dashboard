import { useEffect, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  formatElapsed,
  otherParticipant,
  participantInitials,
  participantName,
} from '../../utils/callDisplay'

const IN_PROGRESS_PHASES = ['dialing', 'connecting', 'active']

export function CallScreen({ callCenter, myUid }) {
  const {
    phase,
    call,
    incomingCall,
    mode,
    localStream,
    remoteStream,
    muted,
    videoOff,
    error,
    hangUp,
    dismiss,
    toggleMute,
    toggleCamera,
  } = callCenter

  const remote = otherParticipant(call || incomingCall, myUid)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
  }, [remoteStream])

  useEffect(() => {
    if (phase !== 'active') {
      setElapsed(0)
      return undefined
    }
    const startedAt = Date.now()
    setElapsed(0)
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [phase])

  const inProgress = IN_PROGRESS_PHASES.includes(phase)
  const isVideo = mode === 'video'
  const hasRemoteVideo = Boolean(
    remoteStream && remoteStream.getVideoTracks().length > 0,
  )
  const name = participantName(remote)
  const initials = participantInitials(remote)

  let statusText = ''
  if (phase === 'dialing') statusText = 'Ringing…'
  else if (phase === 'connecting') statusText = 'Connecting…'
  else if (phase === 'active') statusText = formatElapsed(elapsed)
  else if (phase === 'declined') statusText = 'Call declined'
  else if (phase === 'missed') statusText = 'Call missed'
  else if (phase === 'ended') statusText = 'Call ended'
  else if (phase === 'error') statusText = 'Call failed'

  return (
    <div className="call-screen">
      <div className="call-screen-stage">
        {isVideo && inProgress && hasRemoteVideo ? (
          <video
            ref={remoteVideoRef}
            className="call-remote-video"
            autoPlay
            playsInline
          />
        ) : (
          <div className="call-avatar-block">
            <span className="call-avatar" aria-hidden="true">
              {initials}
            </span>
            {!inProgress && (
              <span className="call-state-icon" aria-hidden="true">
                {phase === 'declined' || phase === 'missed' || phase === 'ended' || phase === 'error' ? (
                  <PhoneOff size={20} />
                ) : (
                  <Wifi size={20} />
                )}
              </span>
            )}
          </div>
        )}

        {inProgress && isVideo && localStream && (
          <video
            ref={localVideoRef}
            className="call-local-video"
            autoPlay
            playsInline
            muted
          />
        )}

        <div className="call-screen-info">
          <h3 className="call-screen-name">{name}</h3>
          <p className="call-screen-status">{statusText}</p>
          {phase === 'error' && error && (
            <p className="call-screen-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      {inProgress && (
        <div className="call-controls">
          <button
            type="button"
            className={`call-control-button ${muted ? 'active' : ''}`}
            onClick={toggleMute}
            aria-pressed={muted}
            title={muted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {muted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          {isVideo && (
            <button
              type="button"
              className={`call-control-button ${videoOff ? 'active' : ''}`}
              onClick={toggleCamera}
              aria-pressed={videoOff}
              title={videoOff ? 'Turn camera on' : 'Turn camera off'}
            >
              {videoOff ? <VideoOff size={22} /> : <Video size={22} />}
            </button>
          )}
          <button
            type="button"
            className="call-control-button call-control-end"
            onClick={hangUp}
            title="End call"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      )}

      {!inProgress && (
        <div className="call-controls">
          <button
            type="button"
            className="call-control-button call-control-dismiss"
            onClick={dismiss}
            title="Close"
          >
            <WifiOff size={20} />
            <span>Close</span>
          </button>
        </div>
      )}

      {!inProgress && (phase === 'missed' || phase === 'ended' || phase === 'declined') && (
        <p className="call-screen-hint">
          You can start a new call from the dialer below.
        </p>
      )}
    </div>
  )
}