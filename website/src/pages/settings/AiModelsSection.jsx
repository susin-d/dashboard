import { useEffect, useState } from 'react'
import { Bot, Check, Eye, EyeOff, Key, Lock, Save } from 'lucide-react'
import {
  loadAiModels,
  saveAiModelPreference,
} from '../../lib/aiModelsApi'
import { CustomDropdown } from '../../components/ui/CustomDropdown'

const DEFAULT_PROVIDER = 'openai'

export function AiModelsSection() {
  const [providers, setProviders] = useState([])
  const [selectedProvider, setSelectedProvider] = useState(DEFAULT_PROVIDER)
  const [selectedModel, setSelectedModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    loadAiModels()
      .then((data) => {
        if (!active) return
        const catalog = data.providers || []
        setProviders(catalog)
        const preference = data.preference || null

        const defaultProv = data.default_provider || DEFAULT_PROVIDER
        const preselected =
          catalog.find((provider) => provider.id === (preference?.provider || '')) ||
          catalog.find((provider) => provider.id === defaultProv) ||
          catalog[0] ||
          null

        if (preselected) {
          setSelectedProvider(preselected.id)
          const models = preselected.models || []
          setSelectedModel(
            models.some((model) => model.id === preference?.model)
              ? preference.model
              : preselected.default_model || models[0]?.id || '',
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

  const isEnvProvider = Boolean(selectedProviderDescriptor?.env_configured)
  const hasUserKey = Boolean(selectedProviderDescriptor?.has_user_key)

  const providerOptions = providers.map((provider) => ({
    value: provider.id,
    label: provider.env_configured
      ? `${provider.label} (Default)`
      : provider.label,
  }))

  const modelOptions = (selectedProviderDescriptor?.models || []).map((model) => ({
    value: model.id,
    label: model.is_default
      ? `${model.label} (Default)`
      : model.label,
  }))

  const handleProviderChange = (providerId) => {
    const nextProvider = providers.find((provider) => provider.id === providerId)
    const nextModels = nextProvider?.models || []
    setSelectedProvider(providerId)
    setSelectedModel(
      nextModels.some((model) => model.id === selectedModel)
        ? selectedModel
        : nextProvider?.default_model || nextModels[0]?.id || '',
    )
    setApiKey('')
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

    if (!isEnvProvider && !hasUserKey && !apiKey.trim()) {
      setMessage(`Please provide an API key for ${selectedProviderDescriptor?.label || 'the selected provider'}.`)
      return
    }

    setSaving(true)
    setMessage('')
    try {
      const payload = {
        provider: selectedProvider,
        model: selectedModel,
      }
      if (apiKey.trim()) {
        payload.api_key = apiKey.trim()
      }
      const data = await saveAiModelPreference(payload)
      if (data.providers) {
        setProviders(data.providers)
      }
      setApiKey('')
      setMessage('AI model preference saved. Eve will use this model.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

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
              No AI provider available. Add <code>OPENAI_API_KEY</code>,{' '}
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

                {isEnvProvider ? (
                  <div className="ai-models-env-row">
                    <span>
                      <strong>Provider authentication</strong>
                      <small>Server environment status</small>
                    </span>
                    <div className="ai-models-env-pill">
                      <Lock size={13} />
                      <span>Using server environment key (Default)</span>
                    </div>
                  </div>
                ) : (
                  <label className="ai-models-key-row">
                    <span>
                      <strong>API Key</strong>
                      <small>
                        {hasUserKey
                          ? `Saved key active. Enter a new key to update.`
                          : `Enter your ${selectedProviderDescriptor?.label || 'provider'} API key.`}
                      </small>
                    </span>
                    <div className="ai-models-key-wrapper">
                      <div className="ai-models-key-input-container">
                        <Key size={14} className="ai-models-key-icon" />
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value)
                            setMessage('')
                          }}
                          placeholder={
                            hasUserKey
                              ? '•••••••••••••••• (API key configured)'
                              : `Enter ${selectedProviderDescriptor?.label || 'API'} key`
                          }
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="ai-models-key-toggle"
                          onClick={() => setShowApiKey((prev) => !prev)}
                          aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                        >
                          {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {hasUserKey && (
                        <span className="ai-models-key-status">
                          <Check size={12} /> Key configured
                        </span>
                      )}
                    </div>
                  </label>
                )}
              </div>

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