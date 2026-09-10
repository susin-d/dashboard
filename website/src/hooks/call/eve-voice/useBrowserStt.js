import { useEffect } from 'react'
import { loadEveVoicePrefs } from '../../../utils/speech'
import { ECHO_COOLDOWN_MS } from '../callConstants'

export function useBrowserStt({ isEveCall, phase, muted, sttSupported, sttProvider, phaseRef, recognitionRef, permissionBlockedRef, isEveSpeakingRef, isEveThinkingRef, lastSpeechEndRef, setUserTranscript, setSttStatus, sendVoiceToEve }) {
  useEffect(() => {
    if (!isEveCall || phase !== 'active' || muted) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
        recognitionRef.current = null
      }
      setSttStatus(sttProvider === 'groq' || sttSupported ? 'idle' : 'unsupported')
      return
    }

    const SpeechRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
    if (sttProvider === 'groq') {
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
  }, [isEveCall, muted, phase, sendVoiceToEve, sttSupported, sttProvider, phaseRef, recognitionRef, permissionBlockedRef, isEveSpeakingRef, isEveThinkingRef, lastSpeechEndRef, setUserTranscript, setSttStatus])
}
