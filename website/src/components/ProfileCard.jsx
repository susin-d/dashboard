import { useState } from 'react'
import { Mail, ShieldCheck, User, X } from 'lucide-react'
import { updateProfile } from 'firebase/auth'
import { auth } from '../lib/firebase'

export function ProfileCard({ user, onProfileUpdated }) {
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(user?.fullName || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('Name cannot be empty.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() })
      }
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '1.5rem', borderRadius: '12px', background: 'var(--bg-surface, #fff)', border: '1px solid var(--border-color, #ccc)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Edit Profile</h3>
              <button type="button" onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Display Name
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.4rem', border: '1px solid var(--border-color, #ccc)', borderRadius: '6px', padding: '0.4rem 0.6rem' }}>
                  <User size={16} style={{ marginRight: '0.5rem', opacity: 0.7 }} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter full name"
                    style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', color: 'inherit' }}
                    required
                  />
                </div>
              </label>
              {error && <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setEditing(false)} className="secondary-button" style={{ padding: '0.4rem 0.8rem' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="primary-button" style={{ padding: '0.4rem 0.8rem' }}>
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

