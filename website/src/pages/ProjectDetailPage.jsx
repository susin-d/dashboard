import { useState } from 'react'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FolderKanban,
  GitBranch,
  Pencil,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { deleteProject, updateProject } from '../lib/workspaceApi'
import { ConfirmDialog } from '../components/ui'

export function ProjectDetailPage({ project, onBack, onSave }) {
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteRequested, setDeleteRequested] = useState(false)
  const [error, setError] = useState('')
  const updatedAt = new Date(project.updatedAt)

  const openEditor = () => {
    setForm({
      name: project.name,
      description: project.description,
      status: project.status,
      progress: project.progress,
      members: project.members,
      technologies: project.technologies.join(', '),
      githubUrl: project.githubUrl,
      liveUrl: project.liveUrl,
    })
    setEditOpen(true)
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const saveProject = async (event) => {
    event.preventDefault()
    setSaving(true)
    const updatedPayload = {
      name: form.name,
      description: form.description,
      status: form.status,
      progress: Number(form.progress),
      members: Number(form.members),
      technologies: form.technologies
        .split(',')
        .map((technology) => technology.trim())
        .filter(Boolean),
      githubUrl: form.githubUrl,
      liveUrl: form.liveUrl,
    }
    try {
      const updated = await updateProject(project.id, updatedPayload)
      onSave(updated)
      setEditOpen(false)
    } catch (err) {
      setError(err.message || 'Failed to update project.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleteRequested(true)
  }

  const confirmDelete = async () => {
    setDeleteRequested(false)
    try {
      await deleteProject(project.id)
      onBack()
    } catch (err) {
      setError(err.message || 'Failed to delete project.')
    }
  }

  return (
    <section className="project-page">
      <button className="project-back-button" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to projects
      </button>

      <div className="project-page-heading">
        <div className="project-page-icon">
          <FolderKanban size={24} />
        </div>
        <div>
          <p>Project</p>
          <h1>{project.name}</h1>
          <span>{project.description}</span>
        </div>
        <div className="project-page-header-actions">
          <span className="project-status">{project.status}</span>
          <div className="project-page-links">
            <button className="project-edit-button" onClick={openEditor}>
              <Pencil size={15} />
              Edit
            </button>
            <button className="secondary-button" onClick={handleDelete}>
              <Trash2 size={15} />
              Delete
            </button>
            {project.githubUrl && (
              <a href={project.githubUrl} target="_blank" rel="noreferrer">
                <GitBranch size={15} />
                GitHub
              </a>
            )}
            {project.liveUrl && (
              <a
                className="live-link"
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={15} />
                Live site
              </a>
            )}
          </div>
        </div>
      </div>


      <div className="project-page-grid">
        <article className="project-overview-card">
          <div className="project-overview-heading">
            <div>
              <p>Current progress</p>
              <h2>{project.progress}% complete</h2>
            </div>
            <CheckCircle2 size={22} />
          </div>
          <div
            className="project-progress project-page-progress"
            role="progressbar"
            aria-label={`${project.name} progress`}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={project.progress}
          >
            <span style={{ width: `${project.progress}%` }} />
          </div>
        </article>

        <article className="project-overview-card">
          <p className="project-card-label">Project details</p>
          <div className="project-page-details">
            <div>
              <Users size={17} />
              <span>Team</span>
              <strong>
                {project.members}{' '}
                {project.members === 1 ? 'member' : 'members'}
              </strong>
            </div>
            <div>
              <CalendarClock size={17} />
              <span>Last updated</span>
              <strong>
                {updatedAt.toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </strong>
            </div>
          </div>
        </article>

        <article className="project-overview-card project-tech-card">
          <p className="project-card-label">Technologies</p>
          <div className="project-page-tags">
            {project.technologies.length ? (
              project.technologies.map((technology) => (
                <span key={technology}>{technology}</span>
              ))
            ) : (
              <span className="project-no-technologies">No technologies added</span>
            )}
          </div>
        </article>
      </div>

      {editOpen && (
        <div
          className="todo-modal-backdrop"
          onMouseDown={() => setEditOpen(false)}
          role="presentation"
        >
          <div
            className="todo-modal project-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-project-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="todo-modal-heading">
              <div>
                <p>Project</p>
                <h2 id="edit-project-title">Edit project</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setEditOpen(false)}
                aria-label="Close editor"
              >
                <X size={18} />
              </button>
            </div>

            <form className="project-edit-form" onSubmit={saveProject}>
              <label>
                Project name
                <input
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField('description', event.target.value)
                  }
                  rows="3"
                />
              </label>
              <div className="project-edit-form-row">
                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField('status', event.target.value)
                    }
                  >
                    <option>Planning</option>
                    <option>Active</option>
                    <option>On hold</option>
                    <option>Completed</option>
                  </select>
                </label>
                <label>
                  Progress
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.progress}
                    onChange={(event) =>
                      updateField('progress', event.target.value)
                    }
                  />
                </label>
                <label>
                  Team members
                  <input
                    type="number"
                    min="1"
                    value={form.members}
                    onChange={(event) =>
                      updateField('members', event.target.value)
                    }
                  />
                </label>
              </div>
              <label>
                Technologies
                <input
                  value={form.technologies}
                  onChange={(event) =>
                    updateField('technologies', event.target.value)
                  }
                  placeholder="React, Vite, CSS"
                />
              </label>
              <label>
                GitHub URL
                <input
                  type="url"
                  value={form.githubUrl}
                  onChange={(event) =>
                    updateField('githubUrl', event.target.value)
                  }
                />
              </label>
              <label>
                Live site URL
                <input
                  type="url"
                  value={form.liveUrl}
                  onChange={(event) =>
                    updateField('liveUrl', event.target.value)
                  }
                />
              </label>

              <div className="todo-modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </button>
                <button className="primary-button project-save-button" type="submit" disabled={saving}>
                  <Save size={16} />
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {error && <div className="todo-api-error" role="alert">{error}</div>}
      <ConfirmDialog isOpen={deleteRequested} message="Are you sure you want to delete this project?" onCancel={() => setDeleteRequested(false)} onConfirm={confirmDelete} />
    </section>
  )
}
