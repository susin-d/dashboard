import { useState } from 'react'
import {
  CalendarClock,
  ChevronDown,
  FolderKanban,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { createProject, deleteProject } from '../lib/workspaceApi'

const emptyProject = {
  name: '',
  description: '',
  status: 'Planning',
  progress: 0,
  members: 1,
  technologies: '',
  githubUrl: '',
  liveUrl: '',
}

export function ProjectsPage({ projects, setProjects, onOpenProject }) {
  const [openProjects, setOpenProjects] = useState(
    () => new Set([projects[0]?.id]),
  )
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyProject)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleProject = (projectId) => {
    setOpenProjects((current) => {
      const next = new Set(current)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  const submitProject = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const project = await createProject({
        ...form,
        technologies: form.technologies
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      })
      setProjects((current) => [project, ...current])
      setForm(emptyProject)
      setFormOpen(false)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (event, projectId) => {
    event.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this project?')) return
    try {
      await deleteProject(projectId)
      setProjects((current) => current.filter((p) => p.id !== projectId))
    } catch (err) {
      alert(err.message || 'Failed to delete project')
    }
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <section className="projects-page">
      <div className="page-heading">
        <div>
          <p>Work & build</p>
          <h1>Projects</h1>
        </div>
        <div className="page-heading-actions">
          <div className="project-summary">
            <FolderKanban size={16} />
            <span>{projects.length} projects</span>
          </div>
          <button className="primary-button" onClick={() => setFormOpen(true)}>
            <Plus size={16} /> Add project
          </button>
        </div>
      </div>

      <div className="project-list">
        {projects.map((project) => {
          const isOpen = openProjects.has(project.id)
          const updatedAt = new Date(project.updatedAt)

          return (
            <article
              className={`contest-site-card project-list-card ${
                isOpen ? 'open' : ''
              }`}
              key={project.id}
              data-record-id={project.id}
            >
              <button
                className="contest-site-header"
                onClick={() => toggleProject(project.id)}
                aria-expanded={isOpen}
              >
                <span className="contest-site-logo">
                  <FolderKanban size={18} />
                </span>
                <span className="contest-site-copy">
                  <strong>{project.name}</strong>
                  <small>{project.description}</small>
                </span>
                <span className="project-status">{project.status}</span>
                <ChevronDown size={18} />
              </button>

              {isOpen && (
                <div className="contest-site-content project-detail-content">
                  <div className="project-progress-heading">
                    <span>Progress</span>
                    <strong>{project.progress}%</strong>
                  </div>
                  <div
                    className="project-progress"
                    role="progressbar"
                    aria-label={`${project.name} progress`}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={project.progress}
                  >
                    <span style={{ width: `${project.progress}%` }} />
                  </div>

                  <div className="project-detail-grid">
                    <div className="project-detail-item">
                      <Users size={17} />
                      <div>
                        <span>Team</span>
                        <strong>
                          {project.members}{' '}
                          {project.members === 1 ? 'member' : 'members'}
                        </strong>
                      </div>
                    </div>
                    <div className="project-detail-item">
                      <CalendarClock size={17} />
                      <div>
                        <span>Last updated</span>
                        <strong>
                          {updatedAt.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="project-list-footer">
                    <div className="project-tags">
                      {project.technologies.map((technology) => (
                        <span key={technology}>{technology}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={(e) => handleDelete(e, project.id)}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                      <button
                        className="primary-button"
                        onClick={() => onOpenProject(project)}
                      >
                        Open project
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>

      {formOpen && (
        <div className="todo-modal-backdrop" onMouseDown={() => setFormOpen(false)} role="presentation">
          <div className="todo-modal document-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="todo-modal-heading">
              <div><p>Projects</p><h2>Add project</h2></div>
              <button className="icon-button" onClick={() => setFormOpen(false)}><X size={18} /></button>
            </div>
            <form className="project-edit-form" onSubmit={submitProject}>
              {error && <div className="todo-api-error" role="alert">{error}</div>}
              <label>Name<input value={form.name} onChange={(event) => updateField('name', event.target.value)} required /></label>
              <label>Description<textarea rows="3" value={form.description} onChange={(event) => updateField('description', event.target.value)} /></label>
              <div className="project-edit-form-row">
                <label>Status<select value={form.status} onChange={(event) => updateField('status', event.target.value)}><option>Planning</option><option>Active</option><option>On hold</option><option>Completed</option></select></label>
                <label>Progress<input type="number" min="0" max="100" value={form.progress} onChange={(event) => updateField('progress', event.target.value)} /></label>
                <label>Members<input type="number" min="1" value={form.members} onChange={(event) => updateField('members', event.target.value)} /></label>
              </div>
              <label>Technologies<input value={form.technologies} onChange={(event) => updateField('technologies', event.target.value)} placeholder="React, FastAPI, Firebase" /></label>
              <div className="project-edit-form-row">
                <label>GitHub URL<input type="url" value={form.githubUrl} onChange={(event) => updateField('githubUrl', event.target.value)} /></label>
                <label>Live URL<input type="url" value={form.liveUrl} onChange={(event) => updateField('liveUrl', event.target.value)} /></label>
              </div>
              <div className="todo-modal-actions">
                <button className="secondary-button" type="button" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
                <button className="primary-button" type="submit" disabled={saving}><Plus size={16} />{saving ? 'Saving…' : 'Add project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

