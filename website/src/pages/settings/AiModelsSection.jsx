import { useEffect, useState } from 'react'
import { Bot, Save } from 'lucide-react'
import {
  loadAiModels,
  saveAiModelPreference,
} from '../../lib/aiModelsApi'
import { CustomDropdown } from '../../components/ui/CustomDropdown'

const DEFAULT_PROVIDER = 'openai'

export function AiModelsSection() {
  const [providers, setProviders] = useState([])
  const [savedPreference, setSavedPreference] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState(DEFAULT_PROVIDER)
  const [selectedModel, setSelectedModel] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    loadAiModels()
      .then((data) => {
        if (!active) return
        const available = (data.providers || []).filter((provider) => provider.available)
        setProviders(available)
        const preference = data.preference || null
        setSavedPreference(preference)

        const preselected =
          available.find((provider) => provider.id === (preference?.provider || '')) ||
          available[0] ||
          null
        if (preselected) {
          setSelectedProvider(preselected.id)
          setSelectedModel(
            preselected.models.some((model) => model.id === preference?.model)
              ? preference.model
              : preselected.models[0]?.id || '',
          )
        }
      })
      .catch((error) => {
        if (active) setMessage(error.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const selectedProviderDescriptor = providers.find(
    (provider) => provider.id === selectedProvider,
  )

  const providerOptions = providers.map((provider) => ({
    value: provider.id,
    label: provider.label,
  }))

  const modelOptions = (selectedProviderDescriptor?.models || []).map((model) => ({
    value: model.id,
    label: model.label,
  }))

  const handleProviderChange = (providerId) => {
    const nextProvider = providers.find((provider) => provider.id === providerId)
    const nextModels = nextProvider?.models || []
    setSelectedProvider(providerId)
    setSelectedModel(
      nextModels.some((model) => model.id === selectedModel)
        ? selectedModel
        : nextModels[0]?.id || '',
    )
    setMessage('')
  }

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId)
    setMessage('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!selectedProvider || !selectedModel) {
      setMessage('Pick a provider and a model before saving.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const data = await saveAiModelPreference({
        provider: selectedProvider,
        model: selectedModel,
      })
      setSavedPreference(data.preference || null)
      setMessage('AI model preference saved. Eve will use this model.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  const hasUnavailableProvidersWarning =
    savedPreference &&
    !providers.some((provider) => provider.id === savedPreference.provider)

  return (
    <div className="setting-section" id="settings-ai-models">
      <div className="section-heading">
        <h2>AI models</h2>
        <p>Choose which AI provider and model power your EVE assistant.</p>
      </div>

      <div className="setting-content-stack">
        <form className="coding-settings-card" onSubmit={handleSave}>
          <div className="coding-settings-header">
            <span><Bot size={18} /></span>
            <div>
              <h3>EVE model provider</h3>
              <p>Eve uses this provider and model for chat, scheduled reminders, and voice calls.</p>
            </div>
          </div>

          {loading ? (
            <p className="hackathon-source-message" role="status" style={{ padding: '18px 22px' }}>
              Loading AI model options…
            </p>
          ) : providers.length === 0 ? (
            <p className="hackathon-source-message" role="status" style={{ padding: '18px 22px' }}>
              No AI provider is configured on the server. Add <code>OPENAI_API_KEY</code>,{' '}
              <code>ANTHROPIC_API_KEY</code>, or <code>GEMINI_API_KEY</code> to enable EVE.
            </p>
          ) : (
            <>
              <div className="ai-models-fields">
                <label>
                  <span>
                    <strong>Provider</strong>
                    <small>Which AI service runs your model.</small>
                  </span>
                  <CustomDropdown
                    value={selectedProvider}
                    options={providerOptions}
                    onChange={handleProviderChange}
                    ariaLabel="AI provider"
                  />
                </label>
                <label>
                  <span>
                    <strong>Model</strong>
                    <small>Which model from the selected provider Eve uses.</small>
                  </span>
                  <CustomDropdown
                    value={selectedModel}
                    options={modelOptions}
                    onChange={handleModelChange}
                    ariaLabel="AI model"
                  />
                </label>
              </div>

              {hasUnavailableProvidersWarning && (
                <p className="hackathon-source-message" role="status" style={{ padding: '0 22px 12px', margin: 0 }}>
                  Your saved provider has no API key configured on the server, so EVE will fall
                  back to the default provider.
                </p>
              )}

              <div className="coding-settings-footer">
                {message && <p role="status">{message}</p>}
                <button type="submit" disabled={saving}>
                  <Save size={15} />
                  {saving ? 'Saving…' : 'Save model'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}