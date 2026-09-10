import { useCallback } from 'react'
import { loadEveSpeech, transcribeEveAudio } from '../../../lib/eveSpeechApi'
import { loadEveVoicePrefs } from '../../../utils/speech'
import { pickAudioMimeType } from '../callHelpers'

export function useServerSttRecording({ localStreamRef, speechPrefsRef, mediaRecorderRef, mediaChunksRef, audioStreamRef, isEveSpeakingRef, isEveThinkingRef, interruptEve, sendVoiceToEve, setEveTranscript, setSttRecording, setSttStatus }) {
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
    [sendVoiceToEve, setEveTranscript, setSttStatus],
  )

  const startSttRecording = useCallback(() => {
    if (speechPrefsRef.current.sttProvider !== 'groq') return
    if (isEveSpeakingRef.current || isEveThinkingRef.current) interruptEve()
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
  }, [transcribeServerAudio, localStreamRef, interruptEve, speechPrefsRef, mediaRecorderRef, mediaChunksRef, audioStreamRef, isEveSpeakingRef, isEveThinkingRef, setSttRecording, setSttStatus])

  const stopSttRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {}
    }
    mediaRecorderRef.current = null
  }, [mediaRecorderRef])

  return { transcribeServerAudio, startSttRecording, stopSttRecording, loadEveSpeech }
}
