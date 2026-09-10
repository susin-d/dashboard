/** Eve voice hook — single responsibility: STT/TTS and Eve conversation. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { sendEveMessage, streamEveVoice } from '../../lib/eveApi'
import { loadEveSpeech } from '../../lib/eveSpeechApi'
import { streamEveSpeech } from '../../lib/eveSpeechStream'
import { isSpeechRecognitionSupported, loadEveVoicePrefs, selectVoice } from '../../utils/speech'
import { ECHO_COOLDOWN_MS } from './callConstants'
import { resolveSpeechProviders } from './callHelpers'
import { createChunkPlayer } from './eve-voice/audioPlayback'
import { useBrowserStt } from './eve-voice/useBrowserStt'
import { useServerSttRecording } from './eve-voice/useServerSttRecording'

export function useEveVoice({ isEveCall, phase, muted, localStreamRef, phaseRef }) {
  const [userTranscript, setUserTranscript] = useState('')
  const [eveTranscript, setEveTranscript] = useState('Hello! I’m Eve. How can I help you today?')
  const [isEveSpeaking, setIsEveSpeaking] = useState(false)
  const [isEveThinking, setIsEveThinking] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [sttRecording, setSttRecording] = useState(false)
  const [sttStatus, setSttStatus] = useState(() => (isSpeechRecognitionSupported() ? 'idle' : 'unsupported'))
  const [sttSupported] = useState(() => isSpeechRecognitionSupported())
  const [speechPrefs, setSpeechPrefs] = useState(() => resolveSpeechProviders(null))
  const speechPrefsRef = useRef(speechPrefs)
  speechPrefsRef.current = speechPrefs

  const recognitionRef = useRef(null)
  const permissionBlockedRef = useRef(false)
  const isEveSpeakingRef = useRef(false)
  const lastSpeechEndRef = useRef(0)
  const ttsEnabledRef = useRef(ttsEnabled)
  const eveAudioRef = useRef(null)
  const abortTurnRef = useRef(null)
  const playQueueRef = useRef([])
  const mediaRecorderRef = useRef(null)
  const mediaChunksRef = useRef([])
  const audioStreamRef = useRef(null)
  ttsEnabledRef.current = ttsEnabled
  const isEveThinkingRef = useRef(isEveThinking)
  isEveThinkingRef.current = isEveThinking

  const speakServerResponse = useCallback((text) => {
    const prefs = loadEveVoicePrefs()
    const voice = speechPrefsRef.current.ttsVoice
    const provider = speechPrefsRef.current.ttsProvider
    const useStream = provider === 'openrouter' || provider === 'google'
    if (useStream) {
      if (eveAudioRef.current) {
        try {
          eveAudioRef.current.pause()
        } catch {}
        eveAudioRef.current = null
      }
      isEveSpeakingRef.current = true
      setIsEveSpeaking(true)
      streamEveSpeech({
        text,
        language: prefs.language,
        voice,
        rate: prefs.rate,
        pitch: prefs.pitch - 1,
      })
        .then(({ audio }) => {
          eveAudioRef.current = audio
          const finish = () => {
            if (eveAudioRef.current === audio) eveAudioRef.current = null
            isEveSpeakingRef.current = false
            lastSpeechEndRef.current = Date.now()
            setIsEveSpeaking(false)
          }
          audio.onended = finish
          audio.onerror = finish
        })
        .catch(() => {
          isEveSpeakingRef.current = false
          lastSpeechEndRef.current = Date.now()
          setIsEveSpeaking(false)
        })
      return
    }
    isEveSpeakingRef.current = false
    setIsEveSpeaking(false)
  }, [])

  const speakEveResponse = useCallback(
    (text) => {
      if (!text) return
      setEveTranscript(text)
      if (!ttsEnabledRef.current) return

      if (speechPrefsRef.current.ttsProvider === 'google' || speechPrefsRef.current.ttsProvider === 'openrouter') {
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

  const stopPlayback = useCallback(() => {
    playQueueRef.current.length = 0
    if (eveAudioRef.current) {
      try {
        eveAudioRef.current.pause()
      } catch {}
      try {
        eveAudioRef.current.src = ''
      } catch {}
      eveAudioRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }
  }, [])

  const sendVoiceToEve = useCallback(
    async (text) => {
      if (!text || !text.trim()) return
      const clean = text.trim()
      if (abortTurnRef.current) {
        abortTurnRef.current.abort()
        stopPlayback()
        setIsEveThinking(false)
      }
      const controller = new AbortController()
      abortTurnRef.current = controller
      setUserTranscript(clean)
      setIsEveThinking(true)
      setEveTranscript('')

      let sawAudio = false
      let streamFailed = false
      const audioQueueRef = playQueueRef.current
      const playNextChunk = createChunkPlayer({ eveAudioRef, isEveSpeakingRef, lastSpeechEndRef, setIsEveSpeaking, queue: audioQueueRef })

      try {
        await streamEveVoice({
          messages: [{ role: 'user', content: clean }],
          sessionId: null,
          signal: controller.signal,
          onDelta: (chunk) => {
            if (controller.signal.aborted) return
            setEveTranscript((current) => (current === chunk ? current : current + chunk))
          },
          onAudio: (event) => {
            if (controller.signal.aborted) return
            sawAudio = true
            isEveSpeakingRef.current = true
            setIsEveSpeaking(true)
            audioQueueRef.push(event)
            if (audioQueueRef.length === 1) playNextChunk()
          },
          onDone: (doneEvent) => {
            if (controller.signal.aborted) return
            setEveTranscript(doneEvent?.message || '')
          },
        })
        if (controller.signal.aborted) return
      } catch (error) {
        if (controller.signal.aborted || error?.name === 'AbortError') return
        streamFailed = true
      }

      if (!controller.signal.aborted && (streamFailed || (!sawAudio && !isEveSpeakingRef.current))) {
        try {
          const response = await sendEveMessage([{ role: 'user', content: clean }])
          const replyText = response?.message || "I heard you, but I couldn't process that request."
          speakEveResponse(replyText)
        } catch {
          if (controller.signal.aborted) return
          setEveTranscript('Sorry, I had trouble reaching the Eve assistant service.')
        }
      }
      if (!controller.signal.aborted) setIsEveThinking(false)
      if (abortTurnRef.current === controller) abortTurnRef.current = null
    },
    [speakEveResponse, stopPlayback],
  )

  const interruptEve = useCallback(() => {
    if (abortTurnRef.current) {
      abortTurnRef.current.abort()
      abortTurnRef.current = null
    }
    stopPlayback()
    isEveSpeakingRef.current = false
    lastSpeechEndRef.current = Date.now() - ECHO_COOLDOWN_MS
    setIsEveSpeaking(false)
    setIsEveThinking(false)
  }, [stopPlayback])

  const { startSttRecording, stopSttRecording } = useServerSttRecording({
    localStreamRef,
    speechPrefsRef,
    mediaRecorderRef,
    mediaChunksRef,
    audioStreamRef,
    isEveSpeakingRef,
    isEveThinkingRef,
    interruptEve,
    sendVoiceToEve,
    setEveTranscript,
    setSttRecording,
    setSttStatus,
  })

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

  useBrowserStt({
    isEveCall,
    phase,
    muted,
    sttSupported,
    sttProvider: speechPrefs.sttProvider,
    phaseRef,
    recognitionRef,
    permissionBlockedRef,
    isEveSpeakingRef,
    isEveThinkingRef,
    lastSpeechEndRef,
    setUserTranscript,
    setSttStatus,
    sendVoiceToEve,
  })

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

  const stopEveVoice = useCallback(() => {
    if (abortTurnRef.current) {
      abortTurnRef.current.abort()
      abortTurnRef.current = null
    }
    playQueueRef.current.length = 0
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
    lastSpeechEndRef.current = Date.now()
    setIsEveSpeaking(false)
    setIsEveThinking(false)
    setSttRecording(false)
    setSttStatus(speechPrefsRef.current.sttProvider === 'groq' || sttSupported ? 'idle' : 'unsupported')
    setUserTranscript('')
    setEveTranscript('Hello! I’m Eve. How can I help you today?')
  }, [sttSupported])

  return {
    userTranscript,
    eveTranscript,
    isEveSpeaking,
    isEveThinking,
    ttsEnabled,
    sttRecording,
    sttStatus,
    sttSupported,
    speechPrefs,
    speechPrefsRef,
    isEveSpeakingRef,
    lastSpeechEndRef,
    eveAudioRef,
    mediaRecorderRef,
    audioStreamRef,
    recognitionRef,
    permissionBlockedRef,
    ttsEnabledRef,
    isEveThinkingRef,
    setUserTranscript,
    setEveTranscript,
    setIsEveSpeaking,
    setIsEveThinking,
    setTtsEnabled,
    setSttRecording,
    setSttStatus,
    setSpeechPrefs,
    sendVoiceToEve,
    interruptEve,
    startSttRecording,
    stopSttRecording,
    toggleTts,
    stopEveVoice,
    speakEveResponse,
  }
}
