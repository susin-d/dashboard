import { useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Rocket,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { createHackathon, deleteHackathon, updateHackathon } from '../lib/workspaceApi'
import { ConfirmDialog } from '../components/ui'

const emptyHackathon = {
  title: '',
  organizer: '',
  startsAt: '',
  endsAt: '',
  mode: 'Online',
  teamSize: '',
  tags: '',
  url: '',
}

export function HackathonsPage({ hackathons, setHackathons }) {
  const [openHackathons, setOpenHackathons] = useState(
    () => new Set([hackathons[0]?.id]),
  )
  const [detailModalHackathon, setDetailModalHackathon] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyHackathon)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editingHackathon, setEditingHackathon] = useState(null)
  const [editForm, setEditForm] = useState(emptyHackathon)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const toggleHackathon = (hackathonId) => {
    setOpenHackathons((current) => {
      const next = new Set(current)
      if (next.has(hackathonId)) next.delete(hackathonId)
      else next.add(hackathonId)
      return next
    })
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const updateEditField = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }))
  }

  const submitHackathon = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const hackathon = await createHackathon({
        ...form,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      })
      setHackathons((current) => [...current, hackathon].sort(
        (first, second) =>
          new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
      ))
      setForm(emptyHackathon)
      setFormOpen(false)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (hackathon) => {
    setEditingHackathon(hackathon)
    setEditForm({
      title: hackathon.title || '',
      organizer: hackathon.organizer || '',
      startsAt: hackathon.startsAt ? new Date(hackathon.startsAt).toISOString().slice(0, 16) : '',
      endsAt: hackathon.endsAt ? new Date(hackathon.endsAt).toISOString().slice(0, 16) : '',
      mode: hackathon.mode || 'Online',
      teamSize: hackathon.teamSize || '',
      tags: Array.isArray(hackathon.tags) ? hackathon.tags.join(', ') : '',
      url: hackathon.url || '',
    })
    setEditError('')
  }

  const saveHackathonEdit = async (event) => {
    event.preventDefault()
    if (!editingHackathon) return
    setEditSaving(true)
    setEditError('')
    try {
      const updated = await updateHackathon(editingHackathon.id, {
        ...editForm,
        tags: editForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      })
      setHackathons((current) =>
        current.map((item) => (item.id === editingHackathon.id ? updated : item)),
      )
      setEditingHackathon(null)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeleteHackathon = async (hackathonId) => {
    setDeleteId(hackathonId)
  }

  const confirmDeleteHackathon = async () => {
    const hackathonId = deleteId
    setDeleteId(null)
    if (!hackathonId) return
    try {
      await deleteHackathon(hackathonId)
      setHackathons((current) => current.filter((item) => item.id !== hackathonId))
    } catch (err) {
      setEditError(err.message || 'Could not delete hackathon.')
    }
  }

  return (
    <section className="hackathons-page">
      <div className="page-heading">
        <div>
          <p>Build & collaborate</p>
          <h1>Hackathons</h1>
        </div>
        <div className="page-heading-actions">
          <div className="hackathon-summary">
            <Rocket size={16} />
            <span>{hackathons.length} upcoming</span>
          </div>
          <button className="primary-button" onClick={() => setFormOpen(true)}>
            <Plus size={16} /> Add hackathon
          </button>
        </div>
      </div>

      <div className="hackathon-list">
        {hackathons.map((hackathon) => {
          const startsAt = new Date(hackathon.startsAt)
          const endsAt = new Date(hackathon.endsAt)
          const isOpen = openHackathons.has(hackathon.id)
          const isManual = hackathon.source === 'manual'

          return (
            <article
              className={`contest-site-card hackathon-list-card ${
                isOpen ? 'open' : ''
              }`}
              key={hackathon.id}
              data-record-id={hackathon.id}
            >
              <div
                className="contest-site-header"
                onClick={() => toggleHackathon(hackathon.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleHackathon(hackathon.id)
                  }
                }}
                aria-expanded={isOpen}
              >
                <span className="contest-site-logo">
                  <Rocket size={18} />
                </span>
                <span className="contest-site-copy">
                  {hackathon.url ? (
                    <a
                      className="hackathon-title-link"
                      href={hackathon.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      title="Open hackathon details page in a new tab"
                    >
                      <strong>{hackathon.title}</strong>
                      <ExternalLink size={13} className="hackathon-link-icon" />
                    </a>
                  ) : (
                    <strong
                      className="hackathon-title-clickable"
                      onClick={(event) => {
                        event.stopPropagation()
                        setDetailModalHackathon(hackathon)
                      }}
                      title="View hackathon details"
                    >
                      {hackathon.title}
                    </strong>
                  )}
                  <small>
                    {hackathon.organizer}
                    {hackathon.source !== 'manual' && (
                      <> · {hackathon.source.toUpperCase()}</>
                    )}
                  </small>
                </span>
                <span className="contest-upcoming-count">{hackathon.mode}</span>
                <ChevronDown size={18} />
              </div>

              {isOpen && (
                <div className="contest-site-content hackathon-detail-content">
                  <div className="hackathon-detail-grid">
                    <div className="hackathon-detail-item">
                      <CalendarDays size={17} />
                      <div>
                        <span>Dates</span>
                        <strong>
                          {startsAt.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                          {' – '}
                          {endsAt.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </strong>
                      </div>
                    </div>
                    <div className="hackathon-detail-item">
                      <MapPin size={17} />
                      <div>
                        <span>Format</span>
                        <strong>{hackathon.mode}</strong>
                      </div>
                    </div>
                    <div className="hackathon-detail-item">
                      <Users size={17} />
                      <div>
                        <span>Team size</span>
                        <strong>{hackathon.teamSize}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="hackathon-list-footer">
                    <div className="hackathon-tags">
                      {hackathon.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setDetailModalHackathon(hackathon)}
                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.85rem' }}
                      >
                        All details
                      </button>
                      {isManual && (
                        <>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => openEditModal(hackathon)}
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.85rem' }}
                          >
                            <Pencil size={14} /> Edit
                          </button>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => handleDeleteHackathon(hackathon.id)}
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.85rem' }}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </>
                      )}
                      {hackathon.url && (
                        <a
                          className="primary-button"
                          href={hackathon.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View details <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>

      {detailModalHackathon && (
        <div className="todo-modal-backdrop" onMouseDown={() => setDetailModalHackathon(null)} role="presentation">
          <div className="todo-modal document-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="todo-modal-heading">
              <div>
                <p>Hackathon details</p>
                <h2>{detailModalHackathon.title}</h2>
              </div>
              <button className="icon-button" onClick={() => setDetailModalHackathon(null)}><X size={18} /></button>
            </div>
            <div className="hackathon-detail-modal-body">
              <div className="hackathon-modal-grid">
                <div className="hackathon-modal-detail-row">
                  <span>Organizer</span>
                  <strong>{detailModalHackathon.organizer || 'Not specified'}</strong>
                </div>
                <div className="hackathon-modal-detail-row">
                  <span>Source</span>
                  <strong>{detailModalHackathon.source ? detailModalHackathon.source.toUpperCase() : 'MANUAL'}</strong>
                </div>
                <div className="hackathon-modal-detail-row">
                  <span>Format</span>
                  <strong>{detailModalHackathon.mode}</strong>
                </div>
                <div className="hackathon-modal-detail-row">
                  <span>Team Size</span>
                  <strong>{detailModalHackathon.teamSize || 'Not specified'}</strong>
                </div>
                <div className="hackathon-modal-detail-row">
                  <span>Start Date</span>
                  <strong>{new Date(detailModalHackathon.startsAt).toLocaleString()}</strong>
                </div>
                <div className="hackathon-modal-detail-row">
                  <span>End Date</span>
                  <strong>{new Date(detailModalHackathon.endsAt).toLocaleString()}</strong>
                </div>
              </div>

              {detailModalHackathon.tags && detailModalHackathon.tags.length > 0 && (
                <div className="hackathon-modal-detail-row">
                  <span>Tags</span>
                  <div className="hackathon-tags" style={{ marginTop: '4px' }}>
                    {Array.isArray(detailModalHackathon.tags)
                      ? detailModalHackathon.tags.map((tag) => <span key={tag}>{tag}</span>)
                      : <span>{detailModalHackathon.tags}</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="todo-modal-actions">
              {detailModalHackathon.source === 'manual' && (
                <>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      const h = detailModalHackathon
                      setDetailModalHackathon(null)
                      openEditModal(h)
                    }}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      const id = detailModalHackathon.id
                      setDetailModalHackathon(null)
                      handleDeleteHackathon(id)
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </>
              )}
              {detailModalHackathon.url ? (
                <a
                  className="primary-button"
                  href={detailModalHackathon.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open external page <ExternalLink size={14} />
                </a>
              ) : (
                <button className="primary-button" type="button" onClick={() => setDetailModalHackathon(null)}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="todo-modal-backdrop" onMouseDown={() => setFormOpen(false)} role="presentation">
          <div className="todo-modal document-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="todo-modal-heading">
              <div><p>Hackathons</p><h2>Add hackathon</h2></div>
              <button className="icon-button" onClick={() => setFormOpen(false)}><X size={18} /></button>
            </div>
            <form className="project-edit-form" onSubmit={submitHackathon}>
              {error && <div className="todo-api-error" role="alert">{error}</div>}
              <div className="project-edit-form-row">
                <label>Title<input value={form.title} onChange={(event) => updateField('title', event.target.value)} required /></label>
                <label>Organizer<input value={form.organizer} onChange={(event) => updateField('organizer', event.target.value)} /></label>
              </div>
              <div className="project-edit-form-row">
                <label>Starts<input type="datetime-local" value={form.startsAt} onChange={(event) => updateField('startsAt', event.target.value)} required /></label>
                <label>Ends<input type="datetime-local" value={form.endsAt} onChange={(event) => updateField('endsAt', event.target.value)} required /></label>
              </div>
              <div className="project-edit-form-row">
                <label>Mode<select value={form.mode} onChange={(event) => updateField('mode', event.target.value)}><option>Online</option><option>In person</option><option>Hybrid</option></select></label>
                <label>Team size<input value={form.teamSize} onChange={(event) => updateField('teamSize', event.target.value)} placeholder="1–4 members" /></label>
              </div>
              <label>Tags<input value={form.tags} onChange={(event) => updateField('tags', event.target.value)} placeholder="AI, Web, Open Source" /></label>
              <label>Event URL<input type="url" value={form.url} onChange={(event) => updateField('url', event.target.value)} /></label>
              <div className="todo-modal-actions">
                <button className="secondary-button" type="button" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
                <button className="primary-button" type="submit" disabled={saving}><Plus size={16} />{saving ? 'Saving…' : 'Add hackathon'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingHackathon && (
        <div className="todo-modal-backdrop" onMouseDown={() => setEditingHackathon(null)} role="presentation">
          <div className="todo-modal document-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="todo-modal-heading">
              <div><p>Hackathons</p><h2>Edit hackathon</h2></div>
              <button className="icon-button" onClick={() => setEditingHackathon(null)}><X size={18} /></button>
            </div>
            <form className="project-edit-form" onSubmit={saveHackathonEdit}>
              {editError && <div className="todo-api-error" role="alert">{editError}</div>}
              <div className="project-edit-form-row">
                <label>Title<input value={editForm.title} onChange={(event) => updateEditField('title', event.target.value)} required /></label>
                <label>Organizer<input value={editForm.organizer} onChange={(event) => updateEditField('organizer', event.target.value)} /></label>
              </div>
              <div className="project-edit-form-row">
                <label>Starts<input type="datetime-local" value={editForm.startsAt} onChange={(event) => updateEditField('startsAt', event.target.value)} required /></label>
                <label>Ends<input type="datetime-local" value={editForm.endsAt} onChange={(event) => updateEditField('endsAt', event.target.value)} required /></label>
              </div>
              <div className="project-edit-form-row">
                <label>Mode<select value={editForm.mode} onChange={(event) => updateEditField('mode', event.target.value)}><option>Online</option><option>In person</option><option>Hybrid</option></select></label>
                <label>Team size<input value={editForm.teamSize} onChange={(event) => updateEditField('teamSize', event.target.value)} placeholder="1–4 members" /></label>
              </div>
              <label>Tags<input value={editForm.tags} onChange={(event) => updateEditField('tags', event.target.value)} placeholder="AI, Web, Open Source" /></label>
              <label>Event URL<input type="url" value={editForm.url} onChange={(event) => updateEditField('url', event.target.value)} /></label>
              <div className="todo-modal-actions">
                <button className="secondary-button" type="button" onClick={() => setEditingHackathon(null)} disabled={editSaving}>Cancel</button>
                <button className="primary-button" type="submit" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={Boolean(deleteId)} message="Are you sure you want to delete this manual hackathon entry?" onCancel={() => setDeleteId(null)} onConfirm={confirmDeleteHackathon} />
    </section>
  )
}
