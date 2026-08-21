import { useState } from 'react'
import { Blocks, LayoutTemplate, Plus } from 'lucide-react'
import { ConfirmDialog, EmptyState, LoadingState, PageHeader } from '../../components/ui'
import { listStudioTemplates } from '../../lib/studioApi'
import { ProjectCard } from './ProjectCard'
import { CreateProjectModal } from './CreateProjectModal'
import { useStudioProjects } from './useStudioProjects'

export function StudioProjectsPage({ onOpenProject, onNavigate }) {
  const { projects, isLoading, error, refresh, create, remove } = useStudioProjects()
  const [createOpen, setCreateOpen] = useState(false)
  const [templates, setTemplates] = useState([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const openCreateModal = async () => {
    setCreateOpen(true)
    if (!templatesLoaded) {
      try {
        setTemplates(await listStudioTemplates())
      } catch {
        // Template list is optional for creation; blank project still works.
      } finally {
        setTemplatesLoaded(true)
      }
    }
  }

  const handleConfirmDelete = async () => {
    if (!projectToDelete || isDeleting) return
    setIsDeleting(true)
    try {
      await remove(projectToDelete.id)
      setProjectToDelete(null)
    } catch (deleteError) {
      console.error('Could not delete Studio project:', deleteError)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="studio-page">
      <PageHeader
        title="Studio"
        description="Describe an app — Eve plans it, you approve, she builds it in an isolated workspace."
        actions={
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onNavigate?.('studio-templates')}
            >
              <LayoutTemplate size={15} />
              Templates
            </button>
            <button type="button" className="primary-button" onClick={openCreateModal}>
              <Plus size={15} />
              New Project
            </button>
          </>
        }
      />

      {error && (
        <div className="studio-error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={refresh}>Retry</button>
        </div>
      )}

      {isLoading ? (
        <LoadingState message="Loading Studio projects…" />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Blocks}
          title="No Studio projects yet"
          description='Create your first project or just ask Eve: "Build a habit tracker app".'
        />
      ) : (
        <div className="studio-project-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={onOpenProject}
              onDelete={setProjectToDelete}
            />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={create}
        templates={templates}
      />

      <ConfirmDialog
        isOpen={Boolean(projectToDelete)}
        title="Delete Studio Project"
        message={`Delete "${projectToDelete?.name}"? All files, git history, and preview access are permanently removed.`}
        confirmLabel="Delete Project"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  )
}
