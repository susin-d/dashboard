import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { clearAuthSession, deleteAccount } from '../../lib/authApi'
import { clearGmailAuthorization } from '../../lib/firebase'

export function AccountSection({ user }) {
  const [accountDeleting, setAccountDeleting] = useState(false)
  const [accountDeleteMessage, setAccountDeleteMessage] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  useEffect(() => {
    if (!deleteModalOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !accountDeleting) {
        setDeleteModalOpen(false)
        setDeleteConfirmation('')
        setAccountDeleteMessage('')
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [deleteModalOpen, accountDeleting])

  const deleteAccountHandler = async (event) => {
    event.preventDefault()
    if (deleteConfirmation !== user.name) return
    setAccountDeleting(true)
    setAccountDeleteMessage('')
    try {
      await deleteAccount()
      clearAuthSession()
      clearGmailAuthorization()
    } catch (error) {
      setAccountDeleteMessage(error.message || 'Your account could not be deleted.')
      setAccountDeleting(false)
    }
  }

  const openDeleteModal = () => {
    setDeleteConfirmation('')
    setAccountDeleteMessage('')
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (accountDeleting) return
    setDeleteModalOpen(false)
    setDeleteConfirmation('')
    setAccountDeleteMessage('')
  }

  return (
    <div className="setting-section delete-account-section" id="settings-account">
      <div className="section-heading">
        <h2>Delete account</h2>
        <p>Permanently remove your StarWaves account.</p>
      </div>

      <div className="delete-account-card">
        <div>
          <h3>Delete your account</h3>
          <p>
            This permanently deletes your account and cannot be undone.
          </p>
          {accountDeleteMessage && (
            <strong role="alert">{accountDeleteMessage}</strong>
          )}
        </div>
        <button
          type="button"
          onClick={openDeleteModal}
          disabled={accountDeleting}
        >
          <Trash2 size={15} />
          {accountDeleting ? 'Deleting…' : 'Delete account'}
        </button>
      </div>

      {deleteModalOpen && (
        <div
          className="delete-account-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteModal()
          }}
        >
          <section
            className="delete-account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <div className="delete-account-modal-icon">
              <Trash2 size={21} />
            </div>
            <h2 id="delete-account-title">Delete account?</h2>
            <p>
              This permanently deletes your StarWaves account and cannot be
              undone.
            </p>

            <form onSubmit={deleteAccountHandler}>
              <label htmlFor="delete-account-confirmation">
                Type <strong>{user.name}</strong> to confirm
              </label>
              <input
                id="delete-account-confirmation"
                value={deleteConfirmation}
                onChange={(event) => {
                  setDeleteConfirmation(event.target.value)
                  setAccountDeleteMessage('')
                }}
                placeholder={user.name}
                autoComplete="off"
                autoFocus
              />
              {accountDeleteMessage && (
                <p className="delete-account-modal-error" role="alert">
                  {accountDeleteMessage}
                </p>
              )}
              <div className="delete-account-modal-actions">
                <button
                  className="delete-account-cancel"
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={accountDeleting}
                >
                  Cancel
                </button>
                <button
                  className="delete-account-confirm"
                  type="submit"
                  disabled={
                    accountDeleting || deleteConfirmation !== user.name
                  }
                >
                  <Trash2 size={15} />
                  {accountDeleting ? 'Deleting…' : 'Delete account'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
