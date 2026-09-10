import { loadEveVoicePrefs, selectVoice } from '../../../utils/speech'

export function blobFromBase64(base64, mime) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; ++i) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime || 'audio/mpeg' })
}

export function speakChunkText(text, onDone) {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onDone?.()
    return
  }
  const prefs = loadEveVoicePrefs()
  const voices = window.speechSynthesis.getVoices() || []
  const voice = selectVoice(prefs, voices)
  const utterance = new SpeechSynthesisUtterance(text)
  if (voice) utterance.voice = voice
  utterance.lang = prefs.language
  utterance.rate = prefs.rate
  utterance.pitch = prefs.pitch
  utterance.onend = onDone
  utterance.onerror = onDone
  window.speechSynthesis.speak(utterance)
}

export function createChunkPlayer({ eveAudioRef, isEveSpeakingRef, lastSpeechEndRef, setIsEveSpeaking, queue }) {
  const playNextChunk = () => {
    const next = queue.shift()
    if (!next) {
      isEveSpeakingRef.current = false
      lastSpeechEndRef.current = Date.now()
      setIsEveSpeaking(false)
      return
    }
    if (next.audio_base64) {
      try {
        const blob = blobFromBase64(next.audio_base64, next.mime)
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        eveAudioRef.current = audio
        audio.onended = () => {
          URL.revokeObjectURL(url)
          playNextChunk()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          playNextChunk()
        }
        audio.play().catch(() => playNextChunk())
      } catch {
        playNextChunk()
      }
    } else if (next.text) {
      speakChunkText(next.text, playNextChunk)
    } else {
      playNextChunk()
    }
  }
  return playNextChunk
}
