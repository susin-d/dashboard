import { useEffect, useState } from 'react'
import { createStudioProject, listStudioTemplates } from '../../lib/studioApi'
import { StudioHero } from './StudioHero'
import { StudioStarterTemplates } from './StudioStarterTemplates'
import { StudioWorkflowFeatures } from './StudioWorkflowFeatures'
import { deriveProjectName } from './studioConstants'
import { setStudioBrief } from './studioBrief'

export function StudioProjectsPage({ onOpenProject }) {
  const [templates, setTemplates] = useState([])
  const [isCreatingFromPrompt, setIsCreatingFromPrompt] = useState(false)
  const [promptError, setPromptError] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  useEffect(() => {
    let cancelled = false
    listStudioTemplates()
      .then((list) => {
        if (!cancelled) setTemplates(list)
      })
      .catch(() => {
        // Template list is optional for creation; blank project still works.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handlePromptSubmit = async (prompt, templateId, attachments = []) => {
    setIsCreatingFromPrompt(true)
    setPromptError('')
    try {
      const created = await createStudioProject({
        name: deriveProjectName(prompt),
        description: prompt,
        template_id: templateId || null,
        db_preference: 'sqlite',
        auth_enabled: false,
      })
      if (created?.id) {
        if (attachments.length > 0) {
          setStudioBrief(created.id, { prompt, attachments })
        }
        onOpenProject(created)
      }
    } catch (submitError) {
      setPromptError(submitError.message || 'Could not create the project.')
      throw submitError
    } finally {
      setIsCreatingFromPrompt(false)
    }
  }

  const handleSelectStarter = (starterPrompt, starterTemplateId) => {
    setSelectedPrompt(starterPrompt)
    setSelectedTemplateId(starterTemplateId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="studio-page studio-landing-page">
      <StudioHero
        templates={templates}
        isSubmitting={isCreatingFromPrompt}
        onSubmitPrompt={handlePromptSubmit}
        selectedPrompt={selectedPrompt}
        selectedTemplateId={selectedTemplateId}
      />

      {promptError && (
        <div className="studio-error-banner" role="alert">
          <span>{promptError}</span>
        </div>
      )}

      <div className="studio-landing-body">
        <StudioStarterTemplates
          templates={templates}
          onSelectStarter={handleSelectStarter}
        />
        <StudioWorkflowFeatures />
      </div>
    </div>
  )
}
