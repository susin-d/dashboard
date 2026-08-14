import { useEffect, useState } from 'react'
import { AudioLines, Bot, Mic, MicOff, RotateCcw, Save, Volume2 } from 'lucide-react'
import { useSpeechVoices } from '../../hooks/useSpeechVoices'
import {
  loadEveSpeech,
  saveEveSpeechPreference,
  synthesizeEveSpeech,
} from '../../lib/eveSpeechApi'
import { CustomDropdown } from '../../components/ui/CustomDropdown'
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

const DEFAULT_STT_PROVIDER = 'browser'
const DEFAULT_TTS_PROVIDER = 'browser'
const PREVIEW_TEXT = 'Hello! I’m Eve. How can I help you today?'

export function EveVoiceSection() {
  const { voices, voicesLoaded, sttSupported, ttsSupported } = useSpeechVoices()
  const [prefs, setPrefs] = useState(() => loadEveVoicePrefs())
  const [message, setMessage] = useState('')
  const [previewing, setPreviewing] = useState(false)

  // Server-side speech provider catalog + saved preference.
  const [sttProviders, setSttProviders] = useState([])
  const [ttsProviders, setTtsProviders] = useState([])
  const [savedPreference, setSavedPreference] = useState(null)
  const [sttProvider, setSttProvider] = useState(DEFAULT_STT_PROVIDER)
  const [sttModel, setSttModel] = useState('')
  const [ttsProvider, setTtsProvider] = useState(DEFAULT_TTS_PROVIDER)
  const [ttsVoice, setTtsVoice] = useState('')
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [saving, setSaving] = useState(false)

  const languageVoices = voicesForLanguage(voices, prefs.language)

  useEffect(() => {
    let active = true
    loadEveSpeech()
      .then((data) => {
        if (!active) return
        const availableStt = (data.stt_providers || []).filter(
          (provider) => provider.available,
        )
        const availableTts = (data.tts_providers || []).filter(
          (provider) => provider.available,
        )
        setSttProviders(availableStt)
        setTtsProviders(availableTts)
        const preference = data.preference || null
        setSavedPreference(preference)

        const sttChoice =
          availableStt.find(
            (provider) => provider.id === (preference?.stt_provider || ''),
          ) ||
          availableStt[0] ||
          null
        if (sttChoice) {
          setSttProvider(sttChoice.id)
          const sttModels = sttChoice.models || []
          setSttModel(
            sttModels.some((model) => model.id === preference?.stt_model)
              ? preference.stt_model
              : sttModels[0]?.id || '',
          )
        }

        const ttsChoice =
          availableTts.find(
            (provider) => provider.id === (preference?.tts_provider || ''),
          ) ||
          availableTts[0] ||
          null
        if (ttsChoice) {
          setTtsProvider(ttsChoice.id)
          const savedVoice = preference?.tts_voice || ''
          const ttsVoices = ttsChoice.voices || []
          setTtsVoice(
            ttsVoices.some((voice) => voice.id === savedVoice)
              ? savedVoice
              : ttsVoices[0]?.id || '',
          )
        }
      })
      .catch((error) => {
        if (active) setMessage(error.message)
      })
      .finally(() => {
        if (active) setLoadingProviders(false)
      })
    return () => {
      active = false
    }
  }, [])

  const sttProviderDescriptor = sttProviders.find(
    (provider) => provider.id === sttProvider,
  )
  const ttsProviderDescriptor = ttsProviders.find(
    (provider) => provider.id === ttsProvider,
  )

  const sttProviderOptions = sttProviders.map((provider) => ({
    value: provider.id,
    label: provider.label,
  }))
  const sttModelOptions = (sttProviderDescriptor?.models || []).map((model) => ({
    value: model.id,
    label: model.label,
  }))
  const ttsProviderOptions = ttsProviders.map((provider) => ({
    value: provider.id,
    label: provider.label,
  }))
  const ttsVoiceOptions = (ttsProviderDescriptor?.voices || [])
    .filter((voice) => !prefs.language || voice.language === prefs.language)
    .map((voice) => ({ value: voice.id, label: voice.label }))

  const ttsPreviewAvailable =
    ttsProvider === 'google'
      ? Boolean(ttsProviderDescriptor?.available)
      : ttsSupported

  const updatePrefs = (patch, note) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    saveEveVoicePrefs(next)
    if (note) setMessage(note)
  }

  const handleLanguageChange = (event) => {
    const language = event.target.value
    const nextVoiceOptions = (ttsProviderDescriptor?.voices || []).filter(
      (voice) => voice.language === language,
    )
    setTtsVoice(
      nextVoiceOptions.some((voice) => voice.id === ttsVoice)
        ? ttsVoice
        : nextVoiceOptions[0]?.id || '',
    )
    // A new language may not have the previously chosen voice, so reset it.
    updatePrefs({ language, voiceURI: '' }, 'Voice language updated.')
  }

  const handleSttProviderChange = (providerId) => {
    const nextProvider = sttProviders.find(
      (provider) => provider.id === providerId,
    )
    const nextModels = nextProvider?.models || []
    setSttProvider(providerId)
    setSttModel(
      nextModels.some((model) => model.id === sttModel)
        ? sttModel
        : nextModels[0]?.id || '',
    )
    setMessage('')
  }

  const handleSttModelChange = (modelId) => {
    setSttModel(modelId)
    setMessage('')
  }

  const handleTtsProviderChange = (providerId) => {
    const nextProvider = ttsProviders.find(
      (provider) => provider.id === providerId,
    )
    const nextVoices =
      (nextProvider?.voices || []).filter(
        (voice) => !prefs.language || voice.language === prefs.language,
      ) || []
    setTtsProvider(providerId)
    setTtsVoice(
      nextVoices.some((voice) => voice.id === ttsVoice)
        ? ttsVoice
        : nextVoices[0]?.id || '',
    )
    setMessage('')
  }

  const handleTtsVoiceChange = (voiceId) => {
    setTtsVoice(voiceId)
    setMessage('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!sttProvider || !ttsProvider) {
      setMessage('Pick a speech provider before saving.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const data = await saveEveSpeechPreference({
        stt_provider: sttProvider,
        stt_model: sttModel,
        tts_provider: ttsProvider,
        tts_voice: ttsVoice,
      })
      setSavedPreference(data.preference || null)
      setMessage('Speech preferences saved. Eve will use these providers.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const defaults = { ...DEFAULT_EVE_VOICE_PREFS }
    setPrefs(defaults)
    saveEveVoicePrefs(defaults)
    setMessage('Eve voice settings reset to defaults.')
  }

  const playServerAudio = (blob) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => {
      URL.revokeObjectURL(url)
      setPreviewing(false)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      setPreviewing(false)
      setMessage('Could not play Eve speech preview.')
    }
    audio.play().catch(() => {
      URL.revokeObjectURL(url)
      setPreviewing(false)
      setMessage('Could not play Eve speech preview.')
    })
  }

  const handlePreview = () => {
    if (previewing) return
    if (ttsProvider === 'google') {
      setPreviewing(true)
      setMessage('')
      synthesizeEveSpeech({
        text: PREVIEW_TEXT,
        language: prefs.language,
        voice: ttsVoice,
        rate: prefs.rate,
        // Browser pitch defaults to 1 (neutral); Google Cloud expects 0 (neutral).
        pitch: prefs.pitch - 1,
      })
        .then(playServerAudio)
        .catch((error) => {
          setPreviewing(false)
          setMessage(error.message)
        })
      return
    }
    if (!ttsSupported) return
    setPreviewing(true)
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(PREVIEW_TEXT)
    const voice = selectVoice(prefs, voices)
    if (voice) utterance.voice = voice
    utterance.lang = prefs.language
    utterance.rate = prefs.rate
    utterance.pitch = prefs.pitch
    utterance.onend = () => setPreviewing(false)
    utterance.onerror = () => setPreviewing(false)
    window.speechSynthesis.speak(utterance)
  }

  const hasUnavailableProvidersWarning =
    savedPreference &&
    (!sttProviders.some(
      (provider) => provider.id === savedPreference.stt_provider,
    ) ||
      !ttsProviders.some(
        (provider) => provider.id === savedPreference.tts_provider,
      ))

  return (
    <div className="setting-section" id="settings-eve-voice">
      <div className="section-heading">
        <h2>Eve voice</h2>
        <p>
          Choose how Eve listens and sounds during voice calls — which speech
          providers she uses and the language she speaks. Provider choices are
          saved to your account; voice details stay on this browser.
        </p>
      </div>

      <div className="setting-content-stack">
        <form className="coding-settings-card" onSubmit={handleSave}>
          <div className="coding-settings-header">
            <span>
              <Bot size={18} />
            </span>
            <div>
              <h3>Speech provider</h3>
              <p>Which services run Eve's speech recognition and speech synthesis.</p>
            </div>
          </div>

          {loadingProviders ? (
            <p className="hackathon-source-message" role="status" style={{ padding: '18px 22px' }}>
              Loading speech provider options…
            </p>
          ) : sttProviders.length === 0 && ttsProviders.length === 0 ? (
            <p className="hackathon-source-message" role="status" style={{ padding: '18px 22px' }}>
              No server speech provider is configured. Add{' '}
              <code>GROQ_API_KEY</code> or <code>GOOGLE_CLOUD_TTS_API_KEY</code>{' '}
              to the server to enable server-side Eve voice. Eve falls back to
              this browser's built-in speech.
            </p>
          ) : (
            <>
              <div className="ai-models-fields">
                <label>
                  <span>
                    <strong>Speech recognition</strong>
                    <small>Which service listens during Eve voice calls.</small>
                  </span>
                  <CustomDropdown
                    value={sttProvider}
                    options={sttProviderOptions}
                    onChange={handleSttProviderChange}
                    ariaLabel="Speech recognition provider"
                  />
                </label>
                {sttProvider === 'groq' && (
                  <label>
                    <span>
                      <strong>Recognition model</strong>
                      <small>Which Whisper model transcribes your speech.</small>
                    </span>
                    <CustomDropdown
                      value={sttModel}
                      options={sttModelOptions}
                      onChange={handleSttModelChange}
                      ariaLabel="Speech recognition model"
                    />
                  </label>
                )}
                <label>
                  <span>
                    <strong>Speech synthesis</strong>
                    <small>Which service speaks Eve's replies.</small>
                  </span>
                  <CustomDropdown
                    value={ttsProvider}
                    options={ttsProviderOptions}
                    onChange={handleTtsProviderChange}
                    ariaLabel="Speech synthesis provider"
                  />
                </label>
                {ttsProvider === 'google' && (
                  <label>
                    <span>
                      <strong>Synthesis voice</strong>
                      <small>Which Google Cloud voice Eve uses for the selected language.</small>
                    </span>
                    <CustomDropdown
                      value={ttsVoice}
                      options={ttsVoiceOptions}
                      onChange={handleTtsVoiceChange}
                      ariaLabel="Speech synthesis voice"
                    />
                  </label>
                )}
              </div>

              {hasUnavailableProvidersWarning && (
                <p className="hackathon-source-message" role="status" style={{ padding: '0 22px 12px', margin: 0 }}>
                  A saved provider has no API key configured on the server, so
                  Eve will fall back to this browser's built-in speech.
                </p>
              )}

              <div className="coding-settings-footer">
                {message && <p role="status">{message}</p>}
                <button type="submit" disabled={saving}>
                  <Save size={15} />
                  {saving ? 'Saving…' : 'Save speech preferences'}
                </button>
              </div>
            </>
          )}
        </form>

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

            {ttsProvider === 'browser' && (
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
            )}

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
            <button
              type="button"
              className="eve-voice-primary"
              onClick={handlePreview}
              disabled={!ttsPreviewAvailable || previewing}
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
