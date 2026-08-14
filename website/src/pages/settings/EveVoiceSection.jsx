import { useState } from 'react'
import { AudioLines, Mic, MicOff, RotateCcw, Volume2 } from 'lucide-react'
import { useSpeechVoices } from '../../hooks/useSpeechVoices'
import {
  DEFAULT_EVE_VOICE_PREFS,
  EVE_VOICE_LANGUAGES,
  EVE_VOICE_PITCH_OPTIONS,
  EVE_VOICE_RATE_OPTIONS,
  loadEveVoicePrefs,
  saveEveVoicePrefs,
  selectVoice,
  voicesForLanguage,
} from '../../utils/speech'

export function EveVoiceSection() {
  const { voices, voicesLoaded, sttSupported, ttsSupported } = useSpeechVoices()
  const [prefs, setPrefs] = useState(() => loadEveVoicePrefs())
  const [message, setMessage] = useState('')
  const [previewing, setPreviewing] = useState(false)

  const languageVoices = voicesForLanguage(voices, prefs.language)

  const updatePrefs = (patch, note) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    saveEveVoicePrefs(next)
    if (note) setMessage(note)
  }

  const handleLanguageChange = (event) => {
    // A new language may not have the previously chosen voice, so reset it.
    updatePrefs(
      { language: event.target.value, voiceURI: '' },
      'Voice language updated.',
    )
  }

  const handleReset = () => {
    const defaults = { ...DEFAULT_EVE_VOICE_PREFS }
    setPrefs(defaults)
    saveEveVoicePrefs(defaults)
    setMessage('Eve voice settings reset to defaults.')
  }

  const handlePreview = () => {
    if (!ttsSupported || previewing) return
    setPreviewing(true)
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(
      'Hello! I’m Eve. How can I help you today?',
    )
    const voice = selectVoice(prefs, voices)
    if (voice) utterance.voice = voice
    utterance.lang = prefs.language
    utterance.rate = prefs.rate
    utterance.pitch = prefs.pitch
    utterance.onend = () => setPreviewing(false)
    utterance.onerror = () => setPreviewing(false)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="setting-section" id="settings-eve-voice">
      <div className="section-heading">
        <h2>Eve voice</h2>
        <p>
          Choose how Eve sounds during voice calls and which language she listens in.
          Settings are saved on this browser.
        </p>
      </div>

      <div className="setting-content-stack">
        <div className="coding-settings-card">
          <div className="coding-settings-header">
            <span>
              <Volume2 size={18} />
            </span>
            <div>
              <h3>Voice &amp; language</h3>
              <p>Voice input (speech recognition) and Eve's spoken replies (speech synthesis).</p>
            </div>
          </div>

          <div className="coding-profile-fields">
            <label>
              <span>
                <strong>Language</strong>
                <small>Used for voice recognition and matching Eve's voice.</small>
              </span>
              <select value={prefs.language} onChange={handleLanguageChange}>
                {EVE_VOICE_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>
                <strong>Eve's voice</strong>
                <small>Installed browser voices for the selected language.</small>
              </span>
              <select
                value={prefs.voiceURI}
                onChange={(event) => updatePrefs({ voiceURI: event.target.value })}
                disabled={!ttsSupported || languageVoices.length === 0}
              >
                <option value="">System default</option>
                {languageVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
              {!voicesLoaded && <small>Loading voices…</small>}
            </label>

            <label>
              <span>
                <strong>Speaking rate</strong>
                <small>How fast Eve talks.</small>
              </span>
              <select
                value={prefs.rate}
                onChange={(event) =>
                  updatePrefs({ rate: Number(event.target.value) })
                }
              >
                {EVE_VOICE_RATE_OPTIONS.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate.toFixed(2)}×
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>
                <strong>Pitch</strong>
                <small>How high or low Eve's voice sounds.</small>
              </span>
              <select
                value={prefs.pitch}
                onChange={(event) =>
                  updatePrefs({ pitch: Number(event.target.value) })
                }
              >
                {EVE_VOICE_PITCH_OPTIONS.map((pitch) => (
                  <option key={pitch} value={pitch}>
                    {pitch.toFixed(2)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="coding-settings-footer eve-voice-footer">
            {message && <p role="status">{message}</p>}
            <button
              type="button"
              className="eve-voice-primary"
              onClick={handlePreview}
              disabled={!ttsSupported || previewing}
            >
              <AudioLines size={15} />
              {previewing ? 'Speaking…' : 'Preview voice'}
            </button>
            <button type="button" className="eve-voice-reset" onClick={handleReset}>
              <RotateCcw size={15} />
              Reset
            </button>
          </div>
        </div>

        <div className="coding-settings-card">
          <div className="coding-settings-header">
            <span>
              <Mic size={18} />
            </span>
            <div>
              <h3>Browser capabilities</h3>
              <p>What this browser supports for Eve voice calls.</p>
            </div>
          </div>
          <div className="eve-voice-capabilities">
            <span className={sttSupported ? 'supported' : 'unsupported'}>
              {sttSupported ? <Mic size={15} /> : <MicOff size={15} />}
              {sttSupported
                ? 'Speech recognition is supported'
                : 'Speech recognition is not supported in this browser'}
            </span>
            <span className={ttsSupported ? 'supported' : 'unsupported'}>
              <Volume2 size={15} />
              {ttsSupported
                ? 'Speech synthesis is supported'
                : 'Speech synthesis is not supported in this browser'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}