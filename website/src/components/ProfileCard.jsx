import { useEffect, useState } from 'react'
import { Mail, ShieldCheck, User, X } from 'lucide-react'
import { updateUserProfile } from '../lib/authApi'

export function ProfileCard({ user, onProfileUpdated }) {
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(user?.fullName || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setEditing(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editing])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('Name cannot be empty.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateUserProfile(displayName.trim())
      onProfileUpdated?.(displayName.trim())
      setEditing(false)
    } catch (err) {
      setError(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <article className="profile-card">
        <div className="profile-card-header">
          <div className="profile-card-avatar">{user.initials}</div>
          <div>
            <h3>{user.fullName}</h3>
            <p>{user.role}</p>
          </div>
          <button
            type="button"
            className="profile-edit-button"
            onClick={() => {
              setDisplayName(user.fullName)
              setEditing(true)
            }}
          >
            Edit profile
          </button>
        </div>

        <div className="profile-details">
          <div className="profile-detail">
            <Mail size={17} />
            <div>
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
          </div>
          <div className="profile-detail">
            <ShieldCheck size={17} />
            <div>
              <span>Role</span>
              <strong>{user.roleLabel}</strong>
            </div>
          </div>
        </div>
      </article>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(false)}>
          <div className="modal profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" onClick={(e) => e.stopPropagation()}>
            <div className="profile-edit-header">
              <h2 id="profile-edit-title">Edit Profile</h2>
              <button type="button" className="icon-button" onClick={() => setEditing(false)} aria-label="Close profile editor">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <label className="profile-edit-field">
                Display Name
                <div className="profile-edit-input">
                  <User size={16} aria-hidden="true" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>
              </label>
              {error && <p className="form-field-error" role="alert">{error}</p>}
              <div className="profile-edit-actions">
                <button type="button" onClick={() => setEditing(false)} className="secondary-button">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="primary-button">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

