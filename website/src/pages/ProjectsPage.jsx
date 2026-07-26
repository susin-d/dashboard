import { useMemo, useState } from 'react'
import {
  CalendarClock,
  ChevronDown,
  FolderKanban,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { createProject, deleteProject } from '../lib/workspaceApi'
import { ConfirmDialog, CustomDropdown, PageHeader } from '../components/ui'
import { usePersistentState } from '../hooks/usePersistentState'

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

export function ProjectsPage({ projects, setProjects, onOpenProject, canLoadMore, loadingMore, onLoadMore }) {
  const [openProjects, setOpenProjects] = useState(
    () => new Set([projects[0]?.id]),
  )
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyProject)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = usePersistentState('starwaves.projects.status', 'All')
  const [sortOrder, setSortOrder] = usePersistentState('starwaves.projects.sort', 'updated')

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return projects
      .filter((project) => {
        const searchable = `${project.name} ${project.description} ${(project.technologies || []).join(' ')}`.toLowerCase()
        return (!normalizedQuery || searchable.includes(normalizedQuery)) && (statusFilter === 'All' || project.status === statusFilter)
      })
      .sort((first, second) => {
        if (sortOrder === 'name') return first.name.localeCompare(second.name)
        if (sortOrder === 'progress') return Number(second.progress || 0) - Number(first.progress || 0)
        return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
      })
  }, [projects, query, statusFilter, sortOrder])

  const hasFilters = Boolean(query.trim()) || statusFilter !== 'All' || sortOrder !== 'updated'
  const resetFilters = () => { setQuery(''); setStatusFilter('All'); setSortOrder('updated') }

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
    setDeleteId(projectId)
  }

  const confirmDelete = async () => {
    const projectId = deleteId
    setDeleteId(null)
    if (!projectId) return
    try {
      await deleteProject(projectId)
      setProjects((current) => current.filter((p) => p.id !== projectId))
    } catch (err) {
      setError(err.message || 'Failed to delete project')
    }
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <section className="projects-page">
      <PageHeader
        eyebrow="Work & build"
        title="Projects"
        description="Turn ideas into momentum with a clear view of what is moving."
        actions={<>
          <div className="project-summary">
            <FolderKanban size={16} />
            <span>{filteredProjects.length} of {projects.length} projects</span>
          </div>
          <button className="primary-button" onClick={() => setFormOpen(true)}>
            <Plus size={16} /> Add project
          </button>
        </>}
      />

      <div className="workspace-insight-grid project-insight-grid" aria-label="Project overview">
        <div className="workspace-insight-card"><span>Projects</span><strong>{projects.length}</strong><small>across your workspace</small></div>
        <div className="workspace-insight-card"><span>In motion</span><strong>{projects.filter((item) => item.status === 'Active').length}</strong><small>active builds</small></div>
        <div className="workspace-insight-card"><span>Average progress</span><strong>{projects.length ? `${Math.round(projects.reduce((total, item) => total + Number(item.progress || 0), 0) / projects.length)}%` : '—'}</strong><small>across all projects</small></div>
      </div>

      <div className="project-toolbar" aria-label="Filter projects">
        <label className="project-search"><Search size={16} /><span className="sr-only">Search projects</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, tools, or descriptions" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={15} /></button>}</label>
        <div className="project-filter-controls"><SlidersHorizontal size={15} aria-hidden="true" /><CustomDropdown value={statusFilter} onChange={setStatusFilter} ariaLabel="Filter by status" options={['All', 'Active', 'Planning', 'On hold', 'Completed'].map((value) => ({ value, label: value === 'All' ? 'All statuses' : value }))} /><CustomDropdown value={sortOrder} onChange={setSortOrder} ariaLabel="Sort projects" options={[{ value: 'updated', label: 'Recently updated' }, { value: 'progress', label: 'Progress' }, { value: 'name', label: 'Name' }]} />{hasFilters && <button className="project-reset" type="button" onClick={resetFilters}><RotateCcw size={13} /> Reset</button>}</div>
      </div>

      <div className="project-list">
        {filteredProjects.map((project) => {
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
                    <div className="project-card-actions">
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
        {!filteredProjects.length && <div className="project-empty-state"><Search size={22} /><strong>No projects match these filters</strong><span>Try a different search or status.</span>{hasFilters && <button className="secondary-button" type="button" onClick={resetFilters}>Clear filters</button>}</div>}
      </div>

      {canLoadMore && <button className="secondary-button" type="button" onClick={onLoadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more projects'}</button>}

      {formOpen && (
        <div className="todo-modal-backdrop" onMouseDown={() => setFormOpen(false)} role="presentation">
          <div className="todo-modal document-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="todo-modal-heading">
              <div><p>Projects</p><h2>Add project</h2></div>
              <button className="icon-button" onClick={() => setFormOpen(false)} aria-label="Close add project form"><X size={18} /></button>
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
      <ConfirmDialog isOpen={Boolean(deleteId)} message="Are you sure you want to delete this project?" onCancel={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </section>
  )
}

