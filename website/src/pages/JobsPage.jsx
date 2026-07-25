import { useEffect, useState } from 'react'
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { createJob, deleteJob, updateJob } from '../lib/workspaceApi'

const emptyJob = {
  company: '',
  role: '',
  status: 'Saved',
  location: '',
  workType: 'Full-time',
  salary: '',
  appliedDate: '',
  interviewDate: '',
  deadline: '',
  resumeId: '',
  jobUrl: '',
  notes: '',
}

export function JobsPage({ jobs, setJobs, documents, createIntent }) {
  const [openJobs, setOpenJobs] = useState(() => new Set([jobs[0]?.id]))
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyJob)
  const [jobSaving, setJobSaving] = useState(false)
  const [jobError, setJobError] = useState('')

  const [editingJob, setEditingJob] = useState(null)
  const [editForm, setEditForm] = useState(emptyJob)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    if (createIntent?.type === 'job') setFormOpen(true)
  }, [createIntent?.requestId, createIntent?.type])
  const resumeDocuments = documents.filter(
    (document) =>
      document.category === 'Career' ||
      document.name.toLowerCase().includes('resume'),
  )

  const toggleJob = (jobId) => {
    setOpenJobs((current) => {
      const next = new Set(current)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }

  const addJob = async (event) => {
    event.preventDefault()
    setJobSaving(true)
    setJobError('')
    try {
      const created = await createJob(form)
      setJobs((current) => [created, ...current])
      setForm(emptyJob)
      setFormOpen(false)
    } catch (error) {
      setJobError(error.message)
    } finally {
      setJobSaving(false)
    }
  }

  const openEditModal = (job) => {
    setEditingJob(job)
    setEditForm({
      company: job.company || '',
      role: job.role || '',
      status: job.status || 'Saved',
      location: job.location || '',
      workType: job.workType || 'Full-time',
      salary: job.salary || '',
      appliedDate: job.appliedDate || '',
      interviewDate: job.interviewDate || '',
      deadline: job.deadline || '',
      resumeId: job.resumeId || '',
      jobUrl: job.jobUrl || '',
      notes: job.notes || '',
    })
    setEditError('')
  }

  const saveJobEdit = async (event) => {
    event.preventDefault()
    if (!editingJob) return
    setEditSaving(true)
    setEditError('')
    try {
      const updated = await updateJob(editingJob.id, editForm)
      setJobs((current) =>
        current.map((item) => (item.id === editingJob.id ? updated : item)),
      )
      setEditingJob(null)
    } catch (error) {
      setEditError(error.message)
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job entry?')) return
    try {
      await deleteJob(jobId)
      setJobs((current) => current.filter((item) => item.id !== jobId))
    } catch (error) {
      alert(error.message || 'Could not delete job.')
    }
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const updateEditField = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <section className="jobs-page">
      <div className="page-heading">
        <div>
          <p>Career tracker</p>
          <h1>Jobs</h1>
        </div>
        <button
          className="primary-button jobs-add-button"
          onClick={() => setFormOpen(true)}
        >
          <Plus size={17} />
          Add job
        </button>
      </div>

      <div className="job-list">
        {jobs.map((job) => {
          const isOpen = openJobs.has(job.id)
          const selectedResume = documents.find(
            (document) => document.id === job.resumeId,
          )

          return (
            <article
              className={`contest-site-card job-list-card ${isOpen ? 'open' : ''}`}
              key={job.id}
            >
              <button
                className="contest-site-header"
                onClick={() => toggleJob(job.id)}
                aria-expanded={isOpen}
              >
                <span className="contest-site-logo">
                  <BriefcaseBusiness size={18} />
                </span>
                <span className="contest-site-copy">
                  <strong>{job.role}</strong>
                  <small>{job.company}</small>
                </span>
                <span className="project-status">{job.status}</span>
                <ChevronDown size={18} />
              </button>

              {isOpen && (
                <div className="contest-site-content job-detail-content">
                  <div className="job-detail-grid">
                    <div className="job-detail-item">
                      <MapPin size={17} />
                      <div><span>Location</span><strong>{job.location}</strong></div>
                    </div>
                    <div className="job-detail-item">
                      <BriefcaseBusiness size={17} />
                      <div><span>Work type</span><strong>{job.workType}</strong></div>
                    </div>
                    <div className="job-detail-item">
                      <span className="job-currency">₹</span>
                      <div><span>Salary</span><strong>{job.salary || 'Not listed'}</strong></div>
                    </div>
                  </div>

                  <div className="job-dates">
                    {[
                      ['Applied', job.appliedDate],
                      ['Interview', job.interviewDate],
                      ['Deadline', job.deadline],
                    ].map(([label, date]) => (
                      <div key={label}>
                        <CalendarDays size={15} />
                        <span>{label}</span>
                        <strong>{date || 'Not set'}</strong>
                      </div>
                    ))}
                  </div>

                  {job.notes && <p className="job-notes">{job.notes}</p>}
                  {selectedResume && (
                    <div className="job-resume">
                      <FileText size={17} />
                      <div>
                        <span>Resume used</span>
                        <strong>{selectedResume.name}</strong>
                        <small>
                          {selectedResume.type} · {selectedResume.size}
                        </small>
                      </div>
                      <a
                        href={selectedResume.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={14} />
                        Open
                      </a>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    {job.jobUrl ? (
                      <a
                        className="job-link"
                        href={job.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={14} />
                        View job posting
                      </a>
                    ) : <span />}

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => openEditModal(job)}
                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.85rem' }}
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => handleDeleteJob(job.id)}
                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.85rem' }}
                      >
                        <Trash2 size={14} /> Delete
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
          <div className="todo-modal job-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="todo-modal-heading">
              <div><p>Career</p><h2>Add job record</h2></div>
              <button className="icon-button" onClick={() => setFormOpen(false)} aria-label="Close form"><X size={18} /></button>
            </div>
            <form className="project-edit-form" onSubmit={addJob}>
              {jobError && <div className="todo-api-error" role="alert">{jobError}</div>}
              <div className="project-edit-form-row">
                <label>Company<input value={form.company} onChange={(event) => updateField('company', event.target.value)} required /></label>
                <label>Role<input value={form.role} onChange={(event) => updateField('role', event.target.value)} required /></label>
                <label>Status<select value={form.status} onChange={(event) => updateField('status', event.target.value)}><option>Saved</option><option>Applied</option><option>Interview</option><option>Offer</option><option>Rejected</option></select></label>
              </div>
              <div className="project-edit-form-row">
                <label>Location<input value={form.location} onChange={(event) => updateField('location', event.target.value)} /></label>
                <label>Work type<select value={form.workType} onChange={(event) => updateField('workType', event.target.value)}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Hybrid</option></select></label>
                <label>Salary<input value={form.salary} onChange={(event) => updateField('salary', event.target.value)} /></label>
              </div>
              <div className="project-edit-form-row">
                <label>Applied date<input type="date" value={form.appliedDate} onChange={(event) => updateField('appliedDate', event.target.value)} /></label>
                <label>Interview date<input type="date" value={form.interviewDate} onChange={(event) => updateField('interviewDate', event.target.value)} /></label>
                <label>Deadline<input type="date" value={form.deadline} onChange={(event) => updateField('deadline', event.target.value)} /></label>
              </div>
              <label>
                Resume used
                <select
                  value={form.resumeId}
                  onChange={(event) =>
                    updateField('resumeId', event.target.value)
                  }
                >
                  <option value="">No resume selected</option>
                  {resumeDocuments.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>Job URL<input type="url" value={form.jobUrl} onChange={(event) => updateField('jobUrl', event.target.value)} /></label>
              <label>Notes<textarea rows="3" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} /></label>
              <div className="todo-modal-actions"><button className="secondary-button" type="button" onClick={() => setFormOpen(false)} disabled={jobSaving}>Cancel</button><button className="primary-button jobs-add-button" type="submit" disabled={jobSaving}><Plus size={16} />{jobSaving ? 'Saving…' : 'Add job'}</button></div>
            </form>
          </div>
        </div>
      )}

      {editingJob && (
        <div className="todo-modal-backdrop" onMouseDown={() => setEditingJob(null)} role="presentation">
          <div className="todo-modal job-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="todo-modal-heading">
              <div><p>Career</p><h2>Edit job record</h2></div>
              <button className="icon-button" onClick={() => setEditingJob(null)} aria-label="Close form"><X size={18} /></button>
            </div>
            <form className="project-edit-form" onSubmit={saveJobEdit}>
              {editError && <div className="todo-api-error" role="alert">{editError}</div>}
              <div className="project-edit-form-row">
                <label>Company<input value={editForm.company} onChange={(event) => updateEditField('company', event.target.value)} required /></label>
                <label>Role<input value={editForm.role} onChange={(event) => updateEditField('role', event.target.value)} required /></label>
                <label>Status<select value={editForm.status} onChange={(event) => updateEditField('status', event.target.value)}><option>Saved</option><option>Applied</option><option>Interview</option><option>Offer</option><option>Rejected</option></select></label>
              </div>
              <div className="project-edit-form-row">
                <label>Location<input value={editForm.location} onChange={(event) => updateEditField('location', event.target.value)} /></label>
                <label>Work type<select value={editForm.workType} onChange={(event) => updateEditField('workType', event.target.value)}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Hybrid</option></select></label>
                <label>Salary<input value={editForm.salary} onChange={(event) => updateEditField('salary', event.target.value)} /></label>
              </div>
              <div className="project-edit-form-row">
                <label>Applied date<input type="date" value={editForm.appliedDate} onChange={(event) => updateEditField('appliedDate', event.target.value)} /></label>
                <label>Interview date<input type="date" value={editForm.interviewDate} onChange={(event) => updateEditField('interviewDate', event.target.value)} /></label>
                <label>Deadline<input type="date" value={editForm.deadline} onChange={(event) => updateEditField('deadline', event.target.value)} /></label>
              </div>
              <label>
                Resume used
                <select
                  value={editForm.resumeId}
                  onChange={(event) =>
                    updateEditField('resumeId', event.target.value)
                  }
                >
                  <option value="">No resume selected</option>
                  {resumeDocuments.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>Job URL<input type="url" value={editForm.jobUrl} onChange={(event) => updateEditField('jobUrl', event.target.value)} /></label>
              <label>Notes<textarea rows="3" value={editForm.notes} onChange={(event) => updateEditField('notes', event.target.value)} /></label>
              <div className="todo-modal-actions">
                <button className="secondary-button" type="button" onClick={() => setEditingJob(null)} disabled={editSaving}>Cancel</button>
                <button className="primary-button jobs-add-button" type="submit" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

