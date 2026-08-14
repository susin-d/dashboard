import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createCall,
  sendCallSignal,
  triggerEveCall,
  updateCallStatus,
} from '../lib/callsApi'
import { callsSocket } from '../lib/callsSocket'
import { sendEveMessage } from '../lib/eveApi'
import {
  loadEveSpeech,
  synthesizeEveSpeech,
  transcribeEveAudio,
} from '../lib/eveSpeechApi'
import { ICE_SERVERS, startRingtone, stopRingtone } from '../utils/callWebRTC'
import { notify, requestNotificationPermission } from '../utils/browserNotifications'
import {
  isSpeechRecognitionSupported,
  loadEveVoicePrefs,
  selectVoice,
} from '../utils/speech'

const RING_TIMEOUT_MS = 35000
const ECHO_COOLDOWN_MS = 700

const BUSY_PHASES = ['dialing', 'connecting', 'active', 'incoming']

function pickAudioMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  return candidates.find((type) => window.MediaRecorder.isTypeSupported(type)) || ''
}

function resolveSpeechProviders(data) {
  const preference = data?.preference || {}
  const stt = (data?.stt_providers || []).find(
    (provider) => provider.id === preference.stt_provider,
  )
  const tts = (data?.tts_providers || []).find(
    (provider) => provider.id === preference.tts_provider,
  )
  return {
    sttProvider: stt?.available ? preference.stt_provider : 'browser',
    sttModel: stt?.available ? preference.stt_model || '' : '',
    ttsProvider: tts?.available ? preference.tts_provider : 'browser',
    ttsVoice: tts?.available ? preference.tts_voice || '' : '',
  }
}

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
  const [sttRecording, setSttRecording] = useState(false)
  const [sttStatus, setSttStatus] = useState(() =>
    isSpeechRecognitionSupported() ? 'idle' : 'unsupported',
  )
  const [sttSupported] = useState(() => isSpeechRecognitionSupported())
  const [speechPrefs, setSpeechPrefs] = useState(() =>
    resolveSpeechProviders(null),
  )
  const speechPrefsRef = useRef(speechPrefs)
  speechPrefsRef.current = speechPrefs

  const phaseRef = useRef('idle')
  const pcRef = useRef(null)
  const remoteOfferRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const processedIdsRef = useRef(new Set())
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const callIdRef = useRef(null)
  const ringTimerRef = useRef(null)
  const userRef = useRef(user)
  userRef.current = user

  const recognitionRef = useRef(null)
  const permissionBlockedRef = useRef(false)
  const isEveSpeakingRef = useRef(false)
  const lastSpeechEndRef = useRef(0)
  const ttsEnabledRef = useRef(ttsEnabled)
  const eveAudioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const mediaChunksRef = useRef([])
  const audioStreamRef = useRef(null)
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
      if (ringTimerRef.current) {
        window.clearTimeout(ringTimerRef.current)
        ringTimerRef.current = null
      }
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
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop()
        } catch {}
        mediaRecorderRef.current = null
      }
      audioStreamRef.current?.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
      if (eveAudioRef.current) {
        try {
          eveAudioRef.current.pause()
        } catch {}
        eveAudioRef.current = null
      }
      permissionBlockedRef.current = false
      isEveSpeakingRef.current = false
      lastSpeechEndRef.current = 0
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
      setSttRecording(false)
      setSttStatus(
        speechPrefsRef.current.sttProvider === 'groq' || sttSupported
          ? 'idle'
          : 'unsupported',
      )
      setUserTranscript('')
      setEveTranscript('Hello! I’m Eve. How can I help you today?')
      setPhase(nextPhase)
    },
    [cleanupPeer, stopLocalMedia, sttSupported],
  )

  useEffect(
    () => () => {
      if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current)
      cleanupPeer()
      stopRingtone()
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
    },
    [cleanupPeer],
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

  const handleCallEvent = useCallback(
    async (callData) => {
      if (callData.status === 'declined') {
        notify('Call Declined', `${callData.callee?.name || 'User'} declined your call.`, `call-declined-${callData.id}`)
        teardown('declined')
        return
      }
      if (callData.status === 'missed') {
        notify('Missed Call', `Missed call from ${callData.caller?.name || 'Someone'}.`, `call-missed-${callData.id}`)
        teardown('missed')
        return
      }
      if (callData.status === 'ended') {
        teardown('ended')
        return
      }
      if (callData.status === 'active') {
        setPhase((current) =>
          current === 'dialing' || current === 'connecting' ? 'active' : current,
        )
      }
      if (callData.status === 'ringing' && phaseRef.current === 'incoming') {
        setCall(callData)
      }
      await processMessages(callData)
    },
    [processMessages, teardown],
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

  const speakServerResponse = useCallback((text) => {
    const prefs = loadEveVoicePrefs()
    const voice = speechPrefsRef.current.ttsVoice
    synthesizeEveSpeech({
      text,
      language: prefs.language,
      voice,
      rate: prefs.rate,
      // Browser pitch defaults to 1 (neutral); Google Cloud expects 0 (neutral).
      pitch: prefs.pitch - 1,
    })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        eveAudioRef.current = audio
        isEveSpeakingRef.current = true
        setIsEveSpeaking(true)
        const finish = () => {
          URL.revokeObjectURL(url)
          if (eveAudioRef.current === audio) eveAudioRef.current = null
          isEveSpeakingRef.current = false
          lastSpeechEndRef.current = Date.now()
          setIsEveSpeaking(false)
        }
        audio.onended = finish
        audio.onerror = finish
        audio.play().catch(finish)
      })
      .catch(() => {
        isEveSpeakingRef.current = false
        lastSpeechEndRef.current = Date.now()
        setIsEveSpeaking(false)
      })
  }, [])

  const speakEveResponse = useCallback(
    (text) => {
      if (!text) return
      setEveTranscript(text)
      if (!ttsEnabledRef.current) return

      if (speechPrefsRef.current.ttsProvider === 'google') {
        speakServerResponse(text)
        return
      }

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

      const prefs = loadEveVoicePrefs()
      const voices = window.speechSynthesis.getVoices() || []
      const voice = selectVoice(prefs, voices)

      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      if (voice) utterance.voice = voice
      utterance.lang = prefs.language
      utterance.rate = prefs.rate
      utterance.pitch = prefs.pitch
      const stopSpeaking = () => {
        isEveSpeakingRef.current = false
        lastSpeechEndRef.current = Date.now()
        setIsEveSpeaking(false)
      }
      utterance.onstart = () => {
        isEveSpeakingRef.current = true
        setIsEveSpeaking(true)
      }
      utterance.onend = stopSpeaking
      utterance.onerror = stopSpeaking
      window.speechSynthesis.speak(utterance)
    },
    [speakServerResponse],
  )

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

  const transcribeServerAudio = useCallback(
    async (blob) => {
      const prefs = loadEveVoicePrefs()
      try {
        const data = await transcribeEveAudio(blob, prefs.language)
        const text = (data?.text || '').trim()
        if (text) await sendVoiceToEve(text)
      } catch {
        setEveTranscript('Sorry, I had trouble understanding that audio.')
      } finally {
        setSttStatus('idle')
      }
    },
    [sendVoiceToEve],
  )

  const startSttRecording = useCallback(() => {
    if (speechPrefsRef.current.sttProvider !== 'groq') return
    if (mediaRecorderRef.current) return
    const stream = localStreamRef.current
    if (!stream || typeof window === 'undefined' || !window.MediaRecorder) {
      setSttStatus('error')
      return
    }
    const mimeType = pickAudioMimeType()
    if (!mimeType) {
      setSttStatus('error')
      return
    }
    try {
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        setSttStatus('error')
        return
      }
      const audioStream = new MediaStream(audioTracks)
      const recorder = new MediaRecorder(audioStream, { mimeType })
      mediaChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) mediaChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        setSttRecording(false)
        audioStream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(mediaChunksRef.current, { type: mimeType })
        mediaChunksRef.current = []
        if (blob.size > 0) {
          setSttStatus('listening')
          transcribeServerAudio(blob)
        } else {
          setSttStatus('idle')
        }
      }
      recorder.onerror = () => {
        setSttRecording(false)
        setSttStatus('error')
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      audioStreamRef.current = audioStream
      setSttRecording(true)
      setSttStatus('listening')
    } catch {
      setSttStatus('error')
    }
  }, [transcribeServerAudio])

  const stopSttRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {}
    }
    mediaRecorderRef.current = null
  }, [])

  useEffect(() => {
    if (!isEveCall || phase !== 'active') return undefined
    let active = true
    loadEveSpeech()
      .then((data) => {
        if (active) setSpeechPrefs(resolveSpeechProviders(data))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [isEveCall, phase])

  useEffect(() => {
    if (!isEveCall || phase !== 'active' || muted) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
        recognitionRef.current = null
      }
      setSttStatus(
        speechPrefs.sttProvider === 'groq' || sttSupported ? 'idle' : 'unsupported',
      )
      return
    }

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null
    if (speechPrefs.sttProvider === 'groq') {
      // Server STT is push-to-talk; the browser recognition engine is unused.
      setSttStatus('idle')
      return
    }
    if (!SpeechRecognition) {
      setSttStatus('unsupported')
      return
    }

    let rec = recognitionRef.current
    if (!rec) {
      const prefs = loadEveVoicePrefs()
      rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = prefs.language

      rec.onresult = (event) => {
        // Echo guard: while Eve's TTS plays through the speakers (or within a
        // short cooldown after it stops) the mic picks up her voice. Ignore it
        // so Eve's own speech is never transcribed back into the conversation.
        if (
          isEveSpeakingRef.current ||
          isEveThinkingRef.current ||
          Date.now() - lastSpeechEndRef.current < ECHO_COOLDOWN_MS
        ) {
          return
        }
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

      rec.onstart = () => {
        permissionBlockedRef.current = false
        setSttStatus('listening')
      }

      rec.onerror = (event) => {
        const reason = event?.error
        if (reason === 'not-allowed' || reason === 'service-not-allowed') {
          permissionBlockedRef.current = true
          setSttStatus('permission')
        } else if (reason === 'aborted' || reason === 'no-speech') {
          // transient; recognition restarts via onend
        } else {
          setSttStatus('error')
        }
      }

      rec.onend = () => {
        if (
          phaseRef.current === 'active' &&
          recognitionRef.current &&
          !permissionBlockedRef.current
        ) {
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
  }, [isEveCall, muted, phase, sendVoiceToEve, sttSupported, speechPrefs.sttProvider])

  const dial = useCallback(
    async (calleeIdentifier, requestedMode) => {
      requestNotificationPermission().catch(() => {})
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
      } catch (err) {
        stopLocalMedia()
        setError(err.message || 'The call could not be started.')
        setPhase('error')
      }
    },
    [createPeer, requestMedia, startRingTimeout, stopLocalMedia],
  )

  const accept = useCallback(async () => {
    requestNotificationPermission().catch(() => {})
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
      } catch (err) {
        setError(err.message || 'Could not request call from Eve.')
        setPhase('error')
      }
    },
    [],
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
      if (!next) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
        if (eveAudioRef.current) {
          try {
            eveAudioRef.current.pause()
          } catch {}
          eveAudioRef.current = null
        }
        isEveSpeakingRef.current = false
        lastSpeechEndRef.current = Date.now()
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

  // WebSocket subscription: replaces both the incoming-call scanner and the
  // in-call signal poll. The server pushes events whenever a write occurs.
  useEffect(() => {
    if (!user) return undefined

    callsSocket.connect()
    const unsubscribe = callsSocket.onMessage(async (event) => {
      if (event.type === 'incoming_call') {
        const ringing = event.call
        if (!BUSY_PHASES.includes(phaseRef.current) && ringing.id !== callIdRef.current) {
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
        }
      } else if (event.type === 'call_signal' || event.type === 'call_updated') {
        const callData = event.call
        if (callData.id === callIdRef.current) {
          await handleCallEvent(callData)
        }
      }
    })

    return () => {
      unsubscribe()
      callsSocket.disconnect()
    }
  }, [handleCallEvent, user])

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
    sttSupported,
    sttStatus,
    sttRecording,
    sttProvider: speechPrefs.sttProvider,
    ttsProvider: speechPrefs.ttsProvider,
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
    startSttRecording,
    stopSttRecording,
  }
}