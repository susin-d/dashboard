import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createCall,
  getCall,
  getIncomingCalls,
  sendCallSignal,
  triggerEveCall,
  updateCallStatus,
} from '../lib/callsApi'
import { sendEveMessage } from '../lib/eveApi'
import { ICE_SERVERS, startRingtone, stopRingtone } from '../utils/callWebRTC'
import { notify } from '../utils/browserNotifications'

const INCOMING_POLL_MS = 3000
const CALL_POLL_MS = 2000
const RING_TIMEOUT_MS = 35000

const BUSY_PHASES = ['dialing', 'connecting', 'active', 'incoming']

// Drives one WebRTC call session for the signed-in user, used app-wide by
// App.jsx so calls keep running (and incoming calls keep ringing) anywhere.
export function useCallCenter({ user }) {
  const [phase, setPhase] = useState('idle')
  const [call, setCall] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)
  const [mode, setMode] = useState('video')
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [error, setError] = useState('')

  // Eve voice conversation state
  const [userTranscript, setUserTranscript] = useState('')
  const [eveTranscript, setEveTranscript] = useState('Hello! I’m Eve. How can I help you today?')
  const [isEveSpeaking, setIsEveSpeaking] = useState(false)
  const [isEveThinking, setIsEveThinking] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)

  const phaseRef = useRef('idle')
  const pcRef = useRef(null)
  const remoteOfferRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const processedIdsRef = useRef(new Set())
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const callIdRef = useRef(null)
  const pollTimerRef = useRef(null)
  const incomingTimerRef = useRef(null)
  const ringTimerRef = useRef(null)
  const userRef = useRef(user)
  userRef.current = user

  const recognitionRef = useRef(null)
  const ttsEnabledRef = useRef(ttsEnabled)
  ttsEnabledRef.current = ttsEnabled
  const isEveThinkingRef = useRef(isEveThinking)
  isEveThinkingRef.current = isEveThinking

  const activeCallObj = call || incomingCall
  const isEveCall = Boolean(
    activeCallObj &&
      (activeCallObj.callee?.uid === 'eve-bot' ||
        activeCallObj.caller?.uid === 'eve-bot' ||
        activeCallObj.callee?.email === 'eve@starwaves.app' ||
        activeCallObj.caller?.email === 'eve@starwaves.app'),
  )

  useEffect(() => {
    phaseRef.current = phase
    if (phase === 'incoming' || phase === 'dialing') startRingtone()
    if (phase !== 'incoming' && phase !== 'dialing') stopRingtone()
  }, [phase])

  const clearCallPoll = useCallback(() => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    if (ringTimerRef.current) {
      window.clearTimeout(ringTimerRef.current)
      ringTimerRef.current = null
    }
  }, [])

  const cleanupPeer = useCallback(() => {
    const pc = pcRef.current
    if (pc) {
      try {
        pc.ontrack = null
        pc.onicecandidate = null
        pc.onconnectionstatechange = null
        pc.close()
      } catch {
        // ignore
      }
      pcRef.current = null
    }
  }, [])

  const stopLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    setLocalStream(null)
  }, [])

  const teardown = useCallback(
    (nextPhase) => {
      clearCallPoll()
      cleanupPeer()
      stopLocalMedia()
      stopRingtone()
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
        recognitionRef.current = null
      }
      callIdRef.current = null
      processedIdsRef.current = new Set()
      remoteOfferRef.current = null
      pendingCandidatesRef.current = []
      setCall(null)
      setIncomingCall(null)
      setRemoteStream(null)
      setMuted(false)
      setVideoOff(false)
      setIsEveSpeaking(false)
      setIsEveThinking(false)
      setUserTranscript('')
      setEveTranscript('Hello! I’m Eve. How can I help you today?')
      setPhase(nextPhase)
    },
    [clearCallPoll, cleanupPeer, stopLocalMedia],
  )

  useEffect(
    () => () => {
      if (incomingTimerRef.current) window.clearInterval(incomingTimerRef.current)
      clearCallPoll()
      cleanupPeer()
      stopRingtone()
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
    },
    [clearCallPoll, cleanupPeer],
  )

  const createPeer = useCallback(async () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc
    localStreamRef.current?.getTracks().forEach((track) =>
      pc.addTrack(track, localStreamRef.current),
    )
    pc.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream()
        setRemoteStream(remoteStreamRef.current)
      }
      remoteStreamRef.current.addTrack(event.track)
    }
    pc.onicecandidate = (event) => {
      if (event.candidate && callIdRef.current) {
        sendCallSignal(callIdRef.current, 'ice-candidate', JSON.stringify(event.candidate))
          .catch(() => {})
      }
    }
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === 'connected') {
        setPhase((current) =>
          current === 'dialing' || current === 'connecting' ? 'active' : current,
        )
      } else if (state === 'closed') {
        setPhase((current) => (current === 'active' ? 'ended' : current))
      } else if (state === 'failed') {
        setError('The connection could not be established.')
        setPhase('error')
      }
    }
    return pc
  }, [])

  const requestMedia = useCallback(async (requestedMode) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video:
        requestedMode === 'video'
          ? { width: { ideal: 1280 }, height: { ideal: 720 } }
          : false,
    })
    localStreamRef.current = stream
    setLocalStream(stream)
    return stream
  }, [])

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current
    if (!pc) return
    const waiting = pendingCandidatesRef.current
    pendingCandidatesRef.current = []
    for (const candidate of waiting) {
      try {
        await pc.addIceCandidate(JSON.parse(candidate))
      } catch {
        // ignore malformed or out-of-order candidates
      }
    }
  }, [])

  const processMessages = useCallback(async (callData) => {
    const myUid = userRef.current?.uid
    const answered = { value: false }
    for (const message of callData.messages || []) {
      if (processedIdsRef.current.has(message.id)) continue
      processedIdsRef.current.add(message.id)
      if (message.from_uid === myUid) continue
      const pc = pcRef.current
      if (message.type === 'offer') {
        remoteOfferRef.current = message.payload
      } else if (message.type === 'answer') {
        if (!pc || !pc.localDescription) continue
        try {
          await pc.setRemoteDescription({ type: 'answer', sdp: message.payload })
          answered.value = true
        } catch {
          // ignore stale answer
        }
      } else if (message.type === 'ice-candidate') {
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(JSON.parse(message.payload))
          } catch {
            // ignore
          }
        } else {
          pendingCandidatesRef.current.push(message.payload)
        }
      }
    }
    if (answered.value) {
      await flushPendingCandidates()
      setPhase((current) =>
        current === 'dialing' || current === 'connecting' ? 'active' : current,
      )
    }
  }, [flushPendingCandidates])

  const pollCall = useCallback(
    async (callId) => {
      try {
        const data = await getCall(callId)
        if (data.status === 'declined') {
          notify('Call Declined', `${data.callee?.name || 'User'} declined your call.`, `call-declined-${callId}`)
          teardown('declined')
          return
        }
        if (data.status === 'missed') {
          notify('Missed Call', `Missed call from ${data.caller?.name || 'Someone'}.`, `call-missed-${callId}`)
          teardown('missed')
          return
        }
        if (data.status === 'ended') {
          teardown('ended')
          return
        }
        if (data.status === 'active') {
          setPhase((current) =>
            current === 'dialing' || current === 'connecting' ? 'active' : current,
          )
        }
        if (data.status === 'ringing' && phaseRef.current === 'incoming') {
          setCall(data)
        }
        await processMessages(data)
      } catch {
        // transient errors are ignored; the poll retries shortly
      }
    },
    [processMessages, teardown],
  )

  const startPollLoop = useCallback(
    (callId) => {
      clearCallPoll()
      pollTimerRef.current = window.setInterval(() => pollCall(callId), CALL_POLL_MS)
    },
    [clearCallPoll, pollCall],
  )

  const startRingTimeout = useCallback(() => {
    if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current)
    ringTimerRef.current = window.setTimeout(async () => {
      if (phaseRef.current === 'dialing' && callIdRef.current) {
        try {
          await updateCallStatus(callIdRef.current, 'missed')
        } catch {
          // ignore
        }
        teardown('missed')
      }
    }, RING_TIMEOUT_MS)
  }, [teardown])

  const speakEveResponse = useCallback((text) => {
    if (!text) return
    setEveTranscript(text)
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (!ttsEnabledRef.current) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.onstart = () => setIsEveSpeaking(true)
    utterance.onend = () => setIsEveSpeaking(false)
    utterance.onerror = () => setIsEveSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [])

  const sendVoiceToEve = useCallback(
    async (text) => {
      if (!text || !text.trim() || isEveThinkingRef.current) return
      const clean = text.trim()
      setUserTranscript(clean)
      setIsEveThinking(true)
      try {
        const response = await sendEveMessage([{ role: 'user', content: clean }])
        const replyText = response?.message || "I heard you, but I couldn't process that request."
        speakEveResponse(replyText)
      } catch {
        setEveTranscript('Sorry, I had trouble reaching the Eve assistant service.')
      } finally {
        setIsEveThinking(false)
      }
    },
    [speakEveResponse],
  )

  useEffect(() => {
    if (!isEveCall || phase !== 'active' || muted) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
        recognitionRef.current = null
      }
      return
    }

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null
    if (!SpeechRecognition) return

    let rec = recognitionRef.current
    if (!rec) {
      rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'

      rec.onresult = (event) => {
        let finalResult = ''
        let interimResult = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalResult += event.results[i][0].transcript
          } else {
            interimResult += event.results[i][0].transcript
          }
        }
        if (interimResult) {
          setUserTranscript(interimResult)
        }
        if (finalResult) {
          setUserTranscript(finalResult)
          sendVoiceToEve(finalResult)
        }
      }

      rec.onerror = () => {
        // ignore speech errors silently
      }

      rec.onend = () => {
        if (phaseRef.current === 'active' && recognitionRef.current) {
          try {
            rec.start()
          } catch {}
        }
      }

      recognitionRef.current = rec
      try {
        rec.start()
      } catch {}
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
        recognitionRef.current = null
      }
    }
  }, [isEveCall, muted, phase, sendVoiceToEve])

  const dial = useCallback(
    async (calleeIdentifier, requestedMode) => {
      const requestMode = requestedMode === 'video' ? 'video' : 'audio'
      setError('')
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Voice and video calls are not supported in this browser.')
        setPhase('error')
        return
      }
      try {
        await requestMedia(requestMode)
        setMode(requestMode)
        const created = await createCall(calleeIdentifier, requestMode)
        callIdRef.current = created.id
        processedIdsRef.current = new Set()
        remoteOfferRef.current = null
        pendingCandidatesRef.current = []
        setCall(created)

        const targetIsEve =
          created.callee?.uid === 'eve-bot' ||
          calleeIdentifier.toLowerCase().includes('eve')
        if (targetIsEve || created.status === 'active') {
          setPhase('active')
        } else {
          setPhase('dialing')
          const pc = await createPeer()
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          await sendCallSignal(created.id, 'offer', offer.sdp)
          startRingTimeout()
        }
        startPollLoop(created.id)
      } catch (err) {
        stopLocalMedia()
        setError(err.message || 'The call could not be started.')
        setPhase('error')
      }
    },
    [createPeer, requestMedia, startPollLoop, startRingTimeout, stopLocalMedia],
  )

  const accept = useCallback(async () => {
    const callId = callIdRef.current
    const requestedMode = mode
    if (!callId) return
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Voice and video calls are not supported in this browser.')
      setPhase('error')
      return
    }
    try {
      await requestMedia(requestedMode)
      stopRingtone()
      const currentCall = call || incomingCall
      const targetIsEve =
        currentCall?.caller?.uid === 'eve-bot' || currentCall?.callee?.uid === 'eve-bot'
      if (targetIsEve) {
        await updateCallStatus(callId, 'active')
        setPhase('active')
      } else {
        setPhase('connecting')
        await createPeer()
        if (remoteOfferRef.current) {
          await pcRef.current.setRemoteDescription({
            type: 'offer',
            sdp: remoteOfferRef.current,
          })
          const answer = await pcRef.current.createAnswer()
          await pcRef.current.setLocalDescription(answer)
          await sendCallSignal(callId, 'answer', answer.sdp)
          await flushPendingCandidates()
        }
        await updateCallStatus(callId, 'active')
      }
      startPollLoop(callId)
    } catch (err) {
      stopLocalMedia()
      setError(err.message || 'The call could not be answered.')
      setPhase('error')
    }
  }, [
    createPeer,
    flushPendingCandidates,
    mode,
    requestMedia,
    startPollLoop,
    stopLocalMedia,
    call,
    incomingCall,
  ])

  const requestEveCall = useCallback(
    async (requestedMode = 'audio') => {
      try {
        setError('')
        const created = await triggerEveCall(requestedMode)
        callIdRef.current = created.id
        setIncomingCall(created)
        setMode(requestedMode)
        setPhase('incoming')
        notify(
          'Incoming Eve Call',
          'Incoming voice call from Eve AI Assistant',
          `call-incoming-${created.id}`,
        )
        startPollLoop(created.id)
      } catch (err) {
        setError(err.message || 'Could not request call from Eve.')
        setPhase('error')
      }
    },
    [startPollLoop],
  )

  const decline = useCallback(async () => {
    const callId = callIdRef.current
    if (!callId) return
    try {
      await updateCallStatus(callId, 'declined')
    } catch {
      // ignore
    }
    teardown('declined')
  }, [teardown])

  const hangUp = useCallback(async () => {
    const callId = callIdRef.current
    if (!callId) return
    try {
      await updateCallStatus(callId, 'ended')
    } catch {
      // ignore
    }
    teardown('ended')
  }, [teardown])

  const dismiss = useCallback(() => {
    teardown('idle')
  }, [teardown])

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current
      localStreamRef.current
        ?.getAudioTracks()
        .forEach((track) => {
          track.enabled = !next
        })
      return next
    })
  }, [])

  const toggleCamera = useCallback(() => {
    setVideoOff((current) => {
      const next = !current
      localStreamRef.current
        ?.getVideoTracks()
        .forEach((track) => {
          track.enabled = !next
        })
      return next
    })
  }, [])

  const toggleTts = useCallback(() => {
    setTtsEnabled((current) => {
      const next = !current
      if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        setIsEveSpeaking(false)
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!user && phaseRef.current !== 'idle') {
      teardown('idle')
    }
  }, [teardown, user])

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    const scanIncoming = async () => {
      if (cancelled) return
      if (BUSY_PHASES.includes(phaseRef.current)) return
      try {
        const calls = await getIncomingCalls()
        const ringing = calls[0] || null
        if (ringing && ringing.id !== callIdRef.current) {
          callIdRef.current = ringing.id
          processedIdsRef.current = new Set()
          remoteOfferRef.current = null
          pendingCandidatesRef.current = []
          setCall(null)
          setIncomingCall(ringing)
          setMode(ringing.mode === 'video' ? 'video' : 'audio')
          setPhase('incoming')
          notify(
            'Incoming Call',
            `Incoming ${ringing.mode || 'video'} call from ${ringing.caller?.name || 'Someone'}`,
            `call-incoming-${ringing.id}`,
          )
          startPollLoop(ringing.id)
        }
      } catch {
        // network hiccups are ignored; the scanner retries
      }
    }
    scanIncoming()
    incomingTimerRef.current = window.setInterval(scanIncoming, INCOMING_POLL_MS)
    return () => {
      cancelled = true
      if (incomingTimerRef.current) {
        window.clearInterval(incomingTimerRef.current)
        incomingTimerRef.current = null
      }
    }
  }, [startPollLoop, user])

  return {
    phase,
    call,
    incomingCall,
    mode,
    localStream,
    remoteStream,
    muted,
    videoOff,
    error,
    isEveCall,
    userTranscript,
    eveTranscript,
    isEveSpeaking,
    isEveThinking,
    ttsEnabled,
    dial,
    accept,
    decline,
    hangUp,
    dismiss,
    toggleMute,
    toggleCamera,
    toggleTts,
    requestEveCall,
    sendVoiceToEve,
  }
}