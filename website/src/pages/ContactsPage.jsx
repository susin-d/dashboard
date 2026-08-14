import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Contact,
  Plus,
  Search,
  Star,
  Phone,
  Mail,
  Building,
  Pencil,
  Trash2,
  X,
  Upload,
  RefreshCw,
  CheckCircle2,
  FileText,
} from 'lucide-react'
import {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  toggleContactStarred,
} from '../lib/contactsApi'
import {
  beginGoogleContactsOAuth,
  importGoogleContacts,
  parseGoogleContactsCsv,
  parseVCard,
} from '../lib/googleContacts'
import { CustomDropdown } from '../components/ui/CustomDropdown'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'starred', label: 'Starred' },
  { id: 'work', label: 'Work' },
  { id: 'personal', label: 'Personal' },
  { id: 'recruiter', label: 'Recruiter' },
  { id: 'team', label: 'Team' },
  { id: 'client', label: 'Client' },
  { id: 'general', label: 'General' },
]

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'work', label: 'Work' },
  { value: 'personal', label: 'Personal' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'team', label: 'Team' },
  { value: 'client', label: 'Client' },
]

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/)
  if (!parts.length || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function ContactsPage({ callCenter, onNavigate }) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    category: 'general',
    notes: '',
    starred: false,
  })

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgressText, setImportProgressText] = useState('')
  const fileInputRef = useRef(null)

  const loadAllContacts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listContacts()
      setContacts(data)
    } catch (err) {
      setError(err.message || 'Failed to load contacts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllContacts()
  }, [loadAllContacts])

  // Clear toast after 5s
  useEffect(() => {
    if (!successMessage) return
    const timer = setTimeout(() => setSuccessMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [successMessage])

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.role || '').toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (activeCategory === 'all') return true
      if (activeCategory === 'starred') return c.starred
      return c.category === activeCategory
    })
  }, [contacts, searchQuery, activeCategory])

  const handleOpenAddModal = () => {
    setEditingContact(null)
    setFormValues({
      name: '',
      email: '',
      phone: '',
      company: '',
      role: '',
      category: 'general',
      notes: '',
      starred: false,
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (contact) => {
    setEditingContact(contact)
    setFormValues({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
      role: contact.role || '',
      category: contact.category || 'general',
      notes: contact.notes || '',
      starred: Boolean(contact.starred),
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingContact(null)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!formValues.name.trim()) return

    setIsSaving(true)
    setError('')
    try {
      if (editingContact) {
        const updated = await updateContact(editingContact.id, formValues)
        setContacts((prev) =>
          prev.map((c) => (c.id === editingContact.id ? updated : c)),
        )
      } else {
        const created = await createContact(formValues)
        setContacts((prev) => [created, ...prev])
      }
      setIsModalOpen(false)
      setEditingContact(null)
      setSuccessMessage(editingContact ? 'Contact updated.' : 'Contact created.')
    } catch (err) {
      setError(err.message || 'Failed to save contact.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return
    try {
      await deleteContact(contactId)
      setContacts((prev) => prev.filter((c) => c.id !== contactId))
      setSuccessMessage('Contact deleted.')
    } catch (err) {
      setError(err.message || 'Failed to delete contact.')
    }
  }

  const handleToggleStar = async (contact) => {
    const nextStarred = !contact.starred
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, starred: nextStarred } : c)),
    )
    try {
      await toggleContactStarred(contact.id, nextStarred)
    } catch (err) {
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, starred: contact.starred } : c)),
      )
      setError(err.message || 'Failed to update contact.')
    }
  }

  const handleCallContact = (contact) => {
    const target = contact.phone || contact.email
    if (!target) return
    if (callCenter?.dial) {
      callCenter.dial(target, 'audio')
    } else {
      onNavigate?.('calls')
    }
  }

  const handleMailContact = (contact) => {
    if (!contact.email) return
    window.location.href = `mailto:${encodeURIComponent(contact.email)}`
  }

  // ── Google Contacts Direct OAuth Import ──
  const handleGoogleOAuthSync = async () => {
    setIsImporting(true)
    setError('')
    setImportProgressText('Connecting with Google…')
    try {
      await beginGoogleContactsOAuth()
      setImportProgressText('Fetching contacts from Google People API…')
      const result = await importGoogleContacts()
      await loadAllContacts()
      setIsImportModalOpen(false)
      setSuccessMessage(`Successfully imported ${result.imported_count} new contact${result.imported_count === 1 ? '' : 's'} from Google!`)
    } catch (err) {
      setError(err.message || 'Google Contacts import failed.')
    } finally {
      setIsImporting(false)
      setImportProgressText('')
    }
  }

  // ── Google Contacts CSV / vCard File Import ──
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setError('')
    setImportProgressText(`Reading ${file.name}…`)

    try {
      const text = await file.text()
      let parsedContacts = []

      if (file.name.endsWith('.vcf') || file.name.endsWith('.vcard')) {
        parsedContacts = parseVCard(text)
      } else {
        parsedContacts = parseGoogleContactsCsv(text)
      }

      if (!parsedContacts.length) {
        throw new Error('No valid contacts found in the selected file.')
      }

      setImportProgressText(`Importing ${parsedContacts.length} contacts…`)

      const existingEmails = new Set(contacts.filter((c) => c.email).map((c) => c.email.toLowerCase().trim()))
      const existingPhones = new Set(contacts.filter((c) => c.phone).map((c) => c.phone.replace(/[\s-]/g, '').trim()))
      const existingNames = new Set(contacts.map((c) => c.name.toLowerCase().trim()))

      let count = 0
      for (const item of parsedContacts) {
        const em = (item.email || '').toLowerCase().trim()
        const ph = (item.phone || '').replace(/[\s-]/g, '').trim()
        const nm = (item.name || '').toLowerCase().trim()

        if (em && existingEmails.has(em)) continue
        if (ph && existingPhones.has(ph)) continue
        if (!em && !ph && existingNames.has(nm)) continue

        await createContact(item)
        if (em) existingEmails.add(em)
        if (ph) existingPhones.add(ph)
        if (nm) existingNames.add(nm)
        count++
      }

      await loadAllContacts()
      setIsImportModalOpen(false)
      setSuccessMessage(`Successfully imported ${count} contact${count === 1 ? '' : 's'} from ${file.name}!`)
    } catch (err) {
      setError(err.message || 'File import failed.')
    } finally {
      setIsImporting(false)
      setImportProgressText('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <main className="contacts-page">
      <header className="contacts-header">
        <div className="contacts-header-info">
          <p className="contacts-header-kicker">Communication</p>
          <h1>Contacts</h1>
          <p>
            Manage your personal and professional network, phone directory, and communication links.
          </p>
        </div>
        <div className="contacts-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsImportModalOpen(true)}
            title="Import contacts from Google"
          >
            <Upload size={14} />
            <span>Import Contacts</span>
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleOpenAddModal}
          >
            <Plus size={14} />
            <span>New Contact</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="success-banner" role="status">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Controls: Search + Categories */}
      <div className="contacts-controls">
        <div className="contacts-search-box">
          <Search size={15} />
          <input
            type="text"
            className="contacts-search-input"
            placeholder="Search contacts by name, email, phone, or company…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="contacts-filter-tabs" role="tablist" aria-label="Contact categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat.id}
              className={`contacts-filter-pill ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.id === 'starred' && <Star size={12} />}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="contacts-empty-state">
          <p>Loading contacts directory…</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="contacts-empty-state">
          <Contact size={32} />
          <h3>{searchQuery ? 'No matching contacts found' : 'No contacts saved yet'}</h3>
          <p>
            {searchQuery
              ? 'Try searching with different terms or category filters.'
              : 'Add contacts manually or import your entire address book directly from Google Contacts.'}
          </p>
          {!searchQuery && (
            <div className="contacts-empty-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsImportModalOpen(true)}
              >
                <Upload size={14} />
                <span>Import from Google</span>
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleOpenAddModal}
              >
                <Plus size={14} />
                <span>Create contact</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="contacts-grid" role="list">
          {filteredContacts.map((contact) => (
            <div className="contact-card" key={contact.id} role="listitem">
              <div className="contact-card-top">
                <div className="contact-profile-info">
                  <div className="contact-avatar" aria-hidden="true">
                    {contact.avatarUrl ? (
                      <img src={contact.avatarUrl} alt="" />
                    ) : (
                      getInitials(contact.name)
                    )}
                  </div>
                  <div className="contact-name-block">
                    <h2 className="contact-name">{contact.name}</h2>
                    {(contact.role || contact.company) && (
                      <p className="contact-role-company">
                        {contact.role}
                        {contact.role && contact.company && ' • '}
                        {contact.company}
                      </p>
                    )}
                  </div>
                </div>

                <div className="contact-card-actions">
                  <button
                    type="button"
                    className={`contact-star-btn ${contact.starred ? 'starred' : ''}`}
                    onClick={() => handleToggleStar(contact)}
                    aria-label={contact.starred ? 'Unstar contact' : 'Star contact'}
                    title={contact.starred ? 'Starred' : 'Add to Starred'}
                  >
                    <Star
                      size={15}
                      fill={contact.starred ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
              </div>

              {contact.category && contact.category !== 'general' && (
                <div className="contact-meta-badge">
                  <span>{contact.category}</span>
                </div>
              )}

              <div className="contact-details-list">
                {contact.email && (
                  <div className="contact-detail-row">
                    <Mail size={13} />
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </div>
                )}
                {contact.phone && (
                  <div className="contact-detail-row">
                    <Phone size={13} />
                    <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                  </div>
                )}
                {contact.company && !contact.role && (
                  <div className="contact-detail-row">
                    <Building size={13} />
                    <span>{contact.company}</span>
                  </div>
                )}
              </div>

              {contact.notes && (
                <p className="contact-notes-box" title={contact.notes}>
                  {contact.notes}
                </p>
              )}

              <div className="contact-card-footer">
                <div className="contact-footer-quick-actions">
                  {(contact.phone || contact.email) && (
                    <button
                      type="button"
                      className="contact-quick-btn"
                      onClick={() => handleCallContact(contact)}
                      title={`Call ${contact.name}`}
                    >
                      <Phone size={12} />
                      <span>Call</span>
                    </button>
                  )}
                  {contact.email && (
                    <button
                      type="button"
                      className="contact-quick-btn"
                      onClick={() => handleMailContact(contact)}
                      title={`Send email to ${contact.email}`}
                    >
                      <Mail size={12} />
                      <span>Email</span>
                    </button>
                  )}
                </div>

                <div className="contact-footer-manage-actions">
                  <button
                    type="button"
                    className="contact-action-icon-btn"
                    onClick={() => handleOpenEditModal(contact)}
                    title="Edit contact"
                    aria-label={`Edit ${contact.name}`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="contact-action-icon-btn delete"
                    onClick={() => handleDelete(contact.id)}
                    title="Delete contact"
                    aria-label={`Delete ${contact.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Import from Google Contacts ── */}
      {isImportModalOpen && (
        <div
          className="contact-modal-overlay"
          onClick={() => !isImporting && setIsImportModalOpen(false)}
        >
          <div
            className="contact-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-modal-title"
          >
            <div className="contact-modal-header">
              <h2 id="import-modal-title">Import Contacts</h2>
              <button
                type="button"
                className="contact-modal-close-btn"
                onClick={() => setIsImportModalOpen(false)}
                disabled={isImporting}
                aria-label="Close import dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="contact-import-content">
              {isImporting ? (
                <div className="contact-import-loading">
                  <RefreshCw size={24} className="spin" />
                  <p>{importProgressText || 'Processing contacts…'}</p>
                </div>
              ) : (
                <>
                  {/* Option 1: Direct 1-Click Google OAuth Sync */}
                  <div className="contact-import-option-card">
                    <div className="contact-import-option-header">
                      <div className="contact-import-badge-icon">
                        <Contact size={20} />
                      </div>
                      <div>
                        <h3>Direct Google Contacts Sync</h3>
                        <p>
                          Connect your Google Account to import all names, phone numbers, emails, companies, and avatars directly via Google People API.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleGoogleOAuthSync}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Contact size={14} />
                      <span>Sync with Google Account</span>
                    </button>
                  </div>

                  <div className="contact-import-divider">
                    <span>or upload file</span>
                  </div>

                  {/* Option 2: Upload Google Contacts CSV / vCard */}
                  <div className="contact-import-option-card file-zone">
                    <div className="contact-import-option-header">
                      <div className="contact-import-badge-icon">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h3>Upload Google Contacts File</h3>
                        <p>
                          Export your contacts from Google Contacts (contacts.google.com) as a <strong>Google CSV</strong> or <strong>vCard (.vcf)</strong> and upload it here.
                        </p>
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      id="contacts-file-input"
                      accept=".csv, .vcf, .vcard, text/csv, text/vcard"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Upload size={14} />
                      <span>Select Google CSV / vCard File</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="contact-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsImportModalOpen(false)}
                disabled={isImporting}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add / Edit Contact ── */}
      {isModalOpen && (
        <div className="contact-modal-overlay" onClick={handleCloseModal}>
          <div
            className="contact-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
          >
            <div className="contact-modal-header">
              <h2 id="contact-modal-title">
                {editingContact ? 'Edit Contact' : 'New Contact'}
              </h2>
              <button
                type="button"
                className="contact-modal-close-btn"
                onClick={handleCloseModal}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="contact-modal-form">
              <div className="contact-form-group">
                <label htmlFor="contact-name">Full Name *</label>
                <input
                  id="contact-name"
                  type="text"
                  className="contact-form-input"
                  placeholder="e.g. Alex Johnson"
                  value={formValues.name}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, name: e.target.value }))
                  }
                  required
                  autoFocus
                />
              </div>

              <div className="contact-form-row-2col">
                <div className="contact-form-group">
                  <label htmlFor="contact-email">Email Address</label>
                  <input
                    id="contact-email"
                    type="email"
                    className="contact-form-input"
                    placeholder="alex@example.com"
                    value={formValues.email}
                    onChange={(e) =>
                      setFormValues((v) => ({ ...v, email: e.target.value }))
                    }
                  />
                </div>

                <div className="contact-form-group">
                  <label htmlFor="contact-phone">Phone Number</label>
                  <input
                    id="contact-phone"
                    type="tel"
                    className="contact-form-input"
                    placeholder="+1 (555) 000-0000"
                    value={formValues.phone}
                    onChange={(e) =>
                      setFormValues((v) => ({ ...v, phone: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="contact-form-row-2col">
                <div className="contact-form-group">
                  <label htmlFor="contact-company">Company / Organization</label>
                  <input
                    id="contact-company"
                    type="text"
                    className="contact-form-input"
                    placeholder="Acme Corp"
                    value={formValues.company}
                    onChange={(e) =>
                      setFormValues((v) => ({ ...v, company: e.target.value }))
                    }
                  />
                </div>

                <div className="contact-form-group">
                  <label htmlFor="contact-role">Job Title / Role</label>
                  <input
                    id="contact-role"
                    type="text"
                    className="contact-form-input"
                    placeholder="Engineering Lead"
                    value={formValues.role}
                    onChange={(e) =>
                      setFormValues((v) => ({ ...v, role: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="contact-form-group">
                <label>Category</label>
                <CustomDropdown
                  value={formValues.category}
                  onChange={(cat) =>
                    setFormValues((v) => ({ ...v, category: cat }))
                  }
                  ariaLabel="Contact Category"
                  options={CATEGORY_OPTIONS}
                />
              </div>

              <div className="contact-form-group">
                <label htmlFor="contact-notes">Notes / Context</label>
                <textarea
                  id="contact-notes"
                  className="contact-form-textarea"
                  placeholder="Met at hackathon, recruiter for Q4 roles, etc."
                  value={formValues.notes}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, notes: e.target.value }))
                  }
                />
              </div>

              <label className="contact-checkbox-label">
                <input
                  type="checkbox"
                  checked={formValues.starred}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, starred: e.target.checked }))
                  }
                />
                <span>Add to Starred / Favorites</span>
              </label>

              <div className="contact-modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSaving || !formValues.name.trim()}
                >
                  <span>{isSaving ? 'Saving…' : editingContact ? 'Save Changes' : 'Create Contact'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
