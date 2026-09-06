import "../../styles/pages/studio-shared.css"
import "../../styles/pages/studio-hero.css"
import { useState } from 'react'
import { createStudioProject } from '../../lib/studioApi'
import { StudioHero } from './StudioHero'
import { StudioTabs } from './StudioTabs'
import { deriveProjectName } from './studioConstants'
import { setStudioBrief } from './studioBrief'
import { useStudioProjects } from './useStudioProjects'
import { ArrowUpRight, FolderCode, Sparkles } from 'lucide-react'

export function StudioProjectsPage({ onOpenProject, onNavigate }) {
  const [isCreatingFromPrompt, setIsCreatingFromPrompt] = useState(false)
  const [promptError, setPromptError] = useState('')
  const { projects, isLoading: projectsLoading } = useStudioProjects()

  const handlePromptSubmit = async (prompt, mode = 'plan', model = 'openrouter/free', attachments = []) => {
    setIsCreatingFromPrompt(true)
    setPromptError('')
    try {
      const created = await createStudioProject({
        name: deriveProjectName(prompt),
        description: prompt,
        template_id: null,
        db_preference: 'sqlite',
        auth_enabled: false,
      })
      if (created?.id) {
        setStudioBrief(created.id, { prompt, attachments, mode, model })
        onOpenProject(created)
      }
    } catch (submitError) {
      setPromptError(submitError.message || 'Could not create the project.')
      throw submitError
    } finally {
      setIsCreatingFromPrompt(false)
    }
  }

  return (
    <div className="studio-page studio-page-builder">
      <header className="studio-section-header">
        <div>
          <span className="studio-eyebrow"><Sparkles size={13} /> Studio workspace</span>
          <h2>Turn a clear idea into a working product.</h2>
          <p>Plan, build, and preview full-stack experiences with Eve beside you.</p>
        </div>
        <StudioTabs activeTab="studio" onNavigate={onNavigate} />
      </header>
      <StudioHero
        isSubmitting={isCreatingFromPrompt}
        onSubmitPrompt={handlePromptSubmit}
      />

      {promptError && (
        <div className="studio-error-banner" role="alert">
          <span>{promptError}</span>
        </div>
      )}

      {!projectsLoading && projects.length > 0 && (
        <section className="studio-continue-section" aria-label="Continue building">
          <div className="studio-section-heading-row">
            <div>
              <span className="studio-eyebrow">Your workspace</span>
              <h3>Continue building</h3>
            </div>
            <button type="button" className="studio-text-action" onClick={() => onNavigate?.('studio-apps')}>
              View all apps <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="studio-continue-grid">
            {projects.slice(0, 3).map((project) => (
              <button
                type="button"
                className="studio-continue-card"
                key={project.id}
                onClick={() => onOpenProject?.(project)}
              >
                <span className="studio-continue-icon"><FolderCode size={18} /></span>
                <span className="studio-continue-copy">
                  <strong>{project.name}</strong>
                  <span>{project.last_activity?.label || 'Ready to continue'}</span>
                </span>
                <span className={`studio-status-dot ${project.build_status}`} aria-label={project.build_status} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
