/** Eve voice hook — single responsibility: STT/TTS and Eve conversation. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { sendEveMessage } from '../../lib/eveApi'
import { loadEveSpeech, synthesizeEveSpeech, transcribeEveAudio } from '../../lib/eveSpeechApi'
import { isSpeechRecognitionSupported, loadEveVoicePrefs, selectVoice } from '../../utils/speech'
import { ECHO_COOLDOWN_MS } from './callConstants'
import { pickAudioMimeType, resolveSpeechProviders } from './callHelpers'

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
  const mediaRecorderRef = useRef(null)
  const mediaChunksRef = useRef([])
  const audioStreamRef = useRef(null)
  ttsEnabledRef.current = ttsEnabled
  const isEveThinkingRef = useRef(isEveThinking)
  isEveThinkingRef.current = isEveThinking

  const speakServerResponse = useCallback((text) => {
    const prefs = loadEveVoicePrefs()
    const voice = speechPrefsRef.current.ttsVoice
    synthesizeEveSpeech({
      text,
      language: prefs.language,
      voice,
      rate: prefs.rate,
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
  }, [transcribeServerAudio, localStreamRef])

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
      setSttStatus(speechPrefs.sttProvider === 'groq' || sttSupported ? 'idle' : 'unsupported')
      return
    }

    const SpeechRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
    if (speechPrefs.sttProvider === 'groq') {
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
        if (isEveSpeakingRef.current || isEveThinkingRef.current || Date.now() - lastSpeechEndRef.current < ECHO_COOLDOWN_MS) {
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
        if (interimResult) setUserTranscript(interimResult)
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
          // transient
        } else {
          setSttStatus('error')
        }
      }

      rec.onend = () => {
        if (phaseRef.current === 'active' && recognitionRef.current && !permissionBlockedRef.current) {
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
  }, [isEveCall, muted, phase, sendVoiceToEve, sttSupported, speechPrefs.sttProvider, phaseRef])

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
    startSttRecording,
    stopSttRecording,
    toggleTts,
    stopEveVoice,
    speakEveResponse,
  }
}
