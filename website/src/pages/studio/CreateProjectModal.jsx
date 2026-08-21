import { useEffect, useState } from 'react'
import { FormField, Modal } from '../../components/ui'
import { DB_PREFERENCE_OPTIONS } from './studioConstants'

export function CreateProjectModal({ isOpen, onClose, onCreate, templates = [] }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [dbPreference, setDbPreference] = useState('sqlite')
  const [authEnabled, setAuthEnabled] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName('')
      setDescription('')
      setTemplateId('')
      setDbPreference('sqlite')
      setAuthEnabled(false)
      setIsCreating(false)
      setCreateError('')
    }
  }, [isOpen])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName || isCreating) return
    setIsCreating(true)
    setCreateError('')
    try {
      await onCreate({
        name: cleanName,
        description: description.trim(),
        template_id: templateId || null,
        db_preference: dbPreference,
        auth_enabled: authEnabled,
      })
      onClose()
    } catch (submitError) {
      setCreateError(submitError.message || 'Could not create the project.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Studio Project"
      subtitle="One project = one app in its own workspace. Eve scaffolds and builds it with you."
    >
      <form onSubmit={handleSubmit}>
        <FormField label="Project name" id="studio-project-name">
          <input
            id="studio-project-name"
            type="text"
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Habit Tracker, Portfolio Site"
            autoFocus
            data-modal-initial-focus
            required
          />
        </FormField>

        <FormField label="Description (optional)" id="studio-project-desc">
          <input
            id="studio-project-desc"
            type="text"
            className="text-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you building?"
          />
        </FormField>

        <FormField label="Starter template" id="studio-project-template">
          <select
            id="studio-project-template"
            className="text-input"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">Blank — let Eve pick the stack</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.kind})
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Database preference" id="studio-project-db">
          <select
            id="studio-project-db"
            className="text-input"
            value={dbPreference}
            onChange={(e) => setDbPreference(e.target.value)}
          >
            {DB_PREFERENCE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <label className="studio-auth-toggle">
          <input
            type="checkbox"
            checked={authEnabled}
            onChange={(e) => setAuthEnabled(e.target.checked)}
          />
          <span>Include login / authentication</span>
        </label>

        {createError && (
          <p className="studio-form-error" role="alert">{createError}</p>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={!name.trim() || isCreating}>
            {isCreating ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
