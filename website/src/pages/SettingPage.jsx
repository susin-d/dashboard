import { useEffect, useState } from 'react'
import {
  Check,
  CalendarDays,
  Code2,
  ExternalLink,
  FileText,
  HardDrive,
  Globe2,
  Mail,
  MessageSquare,
  GitFork,
  Presentation,
  RefreshCw,
  Save,
  Sheet,
  Trash2,
  Upload,
  FileUp,
} from 'lucide-react'
import { ProfileCard } from '../components/ProfileCard'
import { clearAuthSession } from '../lib/authApi'
import { clearGmailAuthorization } from '../lib/firebase'
import {
  beginGoogleDriveOAuth,
  disconnectGoogleDrive,
  getGoogleDriveStatus,
} from '../lib/googleDriveApi'
import {
  disconnectGmail,
  disconnectGmailAccount,
  getGmailAccounts,
  getGmailStatus,
} from '../lib/gmailApi'
import { beginGmailOAuth } from '../lib/googleMail'
import { parseIcsContent } from '../utils/icsParser'
import {
  beginGoogleCalendarOAuth,
  loadGoogleCalendarData,
  removeGoogleCalendarAccount,
} from '../lib/googleCalendar'
import {
  loadCompetitiveCodingProfile,
  saveCompetitiveCodingProfile,
} from '../lib/competitiveCodingProfileApi'
import {
  beginGithubOAuth,
  disconnectGithub,
  getGithubStatus,
} from '../lib/githubApi'
import {
  beginGoogleChatOAuth,
  disconnectGoogleChatAccount,
  getGoogleChatAccounts,
} from '../lib/googleChatApi'
import {
  loadHackathons,
  loadHackathonSources,
  setHackathonSourceEnabled,
} from '../lib/workspaceApi'

const workspaceApps = [
  {
    id: 'drive',
    name: 'Google Drive',
    description: 'Upload and import your files.',
    url: 'https://drive.google.com',
    icon: HardDrive,
  },
  {
    id: 'docs',
    name: 'Google Docs',
    description: 'Create and manage documents.',
    url: 'https://docs.google.com',
    icon: FileText,
  },
  {
    id: 'sheets',
    name: 'Google Sheets',
    description: 'Open your spreadsheets.',
    url: 'https://sheets.google.com',
    icon: Sheet,
  },
  {
    id: 'slides',
    name: 'Google Slides',
    description: 'Open your presentations.',
    url: 'https://slides.google.com',
    icon: Presentation,
  },
]

export function SettingPage({
  user,
  onGoogleCalendarsChange,
  onHackathonsChange,
  importedIcsCalendars = [],
  setImportedIcsCalendars,
  setImportedIcsEvents,
}) {
  const [workspaceConnected, setWorkspaceConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [codingProfile, setCodingProfile] = useState({
    codeforces: '',
    codechef: '',
    leetcode: '',
  })
  const [codingSaving, setCodingSaving] = useState(false)
  const [codingMessage, setCodingMessage] = useState('')
  const [githubConnected, setGithubConnected] = useState(false)
  const [githubBusy, setGithubBusy] = useState(false)
  const [githubMessage, setGithubMessage] = useState('')
  const [calendarConnections, setCalendarConnections] = useState([])
  const [calendarBusy, setCalendarBusy] = useState(false)
  const [calendarMessage, setCalendarMessage] = useState('')
  const [gmailAccounts, setGmailAccounts] = useState([])
  const [gmailBusy, setGmailBusy] = useState(false)
  const [gmailMessage, setGmailMessage] = useState('')
  const [googleChatAccounts, setGoogleChatAccounts] = useState([])
  const [googleChatBusy, setGoogleChatBusy] = useState(false)
  const [googleChatMessage, setGoogleChatMessage] = useState('')
  const [hackathonSources, setHackathonSources] = useState([])
  const [hackathonSourceBusy, setHackathonSourceBusy] = useState('')
  const [hackathonSourceMessage, setHackathonSourceMessage] = useState('')
  const [accountDeleting, setAccountDeleting] = useState(false)
  const [accountDeleteMessage, setAccountDeleteMessage] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  const fetchGmailAccounts = () => {
    getGmailAccounts()
      .then(({ accounts }) => {
        setGmailAccounts(accounts || [])
      })
      .catch(() => {
        getGmailStatus()
          .then(({ connected, account }) => {
            if (connected && account) {
              setGmailAccounts([account])
            } else {
              setGmailAccounts([])
            }
          })
          .catch(() => setGmailAccounts([]))
      })
  }

  const fetchGoogleChatAccounts = () => {
    getGoogleChatAccounts()
      .then(({ accounts }) => {
        setGoogleChatAccounts(accounts || [])
      })
      .catch(() => setGoogleChatAccounts([]))
  }

  useEffect(() => {
    fetchGmailAccounts()
    fetchGoogleChatAccounts()
  }, [user?.uid])

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

  useEffect(() => {
    let active = true
    loadCompetitiveCodingProfile()
      .then((profile) => {
        if (active) {
          setCodingProfile({
            codeforces: profile.codeforces ?? '',
            codechef: profile.codechef ?? '',
            leetcode: profile.leetcode ?? '',
          })
        }
      })
      .catch((error) => {
        if (active) setCodingMessage(error.message)
      })
    return () => {
      active = false
    }
  }, [user?.uid])

  useEffect(() => {
    let active = true
    loadHackathonSources()
      .then(({ sources }) => {
        if (active) setHackathonSources(sources)
      })
      .catch((error) => {
        if (active) setHackathonSourceMessage(error.message)
      })
    return () => {
      active = false
    }
  }, [user?.uid])

  useEffect(() => {
    let active = true
    const searchParams = new URLSearchParams(window.location.search)
    const result = searchParams.get('calendar')
    const reason = searchParams.get('reason')
    if (result) {
      setCalendarMessage(
        result === 'connected'
          ? 'Google Calendar connected successfully.'
          : `Google Calendar connection failed: ${reason || 'OAuth authorization failed'}`,
      )
      window.history.replaceState({}, '', window.location.pathname)
    }
    loadGoogleCalendarData()
      .then((data) => {
        if (!active) return
        setCalendarConnections(data.connections)
        onGoogleCalendarsChange(data.events)
      })
      .catch((error) => {
        if (active) setCalendarMessage(error.message)
      })
    return () => {
      active = false
    }
  }, [user?.uid, onGoogleCalendarsChange])

  useEffect(() => {
    let active = true
    const searchParams = new URLSearchParams(window.location.search)
    const result = searchParams.get('drive')
    const reason = searchParams.get('reason')
    if (result === 'error') {
      setConnectionError(`Google Drive connection failed: ${reason || 'OAuth authorization failed'}`)
    }
    if (result) {
      window.history.replaceState({}, '', window.location.pathname)
    }
    getGoogleDriveStatus()
      .then(({ connected }) => {
        if (active) setWorkspaceConnected(connected)
      })
      .catch((error) => {
        if (active) setConnectionError(error.message)
      })
    return () => {
      active = false
    }
  }, [user?.uid])

  useEffect(() => {
    let active = true
    const searchParams = new URLSearchParams(window.location.search)
    const result = searchParams.get('github')
    const gmailResult = searchParams.get('gmail')
    const chatResult = searchParams.get('chat')
    const reason = searchParams.get('reason')
    if (result) {
      setGithubMessage(
        result === 'connected'
          ? 'GitHub connected successfully.'
          : `GitHub connection failed: ${reason || 'OAuth authorization failed'}`,
      )
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (gmailResult) {
      setGmailMessage(
        gmailResult === 'connected'
          ? 'Gmail account connected successfully.'
          : `Gmail connection failed: ${reason || 'OAuth authorization failed'}`,
      )
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (chatResult) {
      setGoogleChatMessage(
        chatResult === 'connected'
          ? 'Google Chat account connected successfully.'
          : `Google Chat connection failed: ${reason || 'OAuth authorization failed'}`,
      )
      window.history.replaceState({}, '', window.location.pathname)
    }
    fetchGoogleChatAccounts()
    getGithubStatus()
      .then(({ connected }) => {
        if (active) setGithubConnected(connected)
      })
      .catch((error) => {
        if (active) setGithubMessage(error.message)
      })
    return () => {
      active = false
    }
  }, [user?.uid])

  const connectWorkspace = async () => {
    setConnecting(true)
    setConnectionError('')
    try {
      if (workspaceConnected) {
        await disconnectGoogleDrive()
        setWorkspaceConnected(false)
      } else {
        await beginGoogleDriveOAuth()
      }
    } catch (error) {
      setConnectionError(error.message || 'Google Workspace could not be connected.')
      setConnecting(false)
    }
  }

  const updateCodingField = (field, value) => {
    setCodingProfile((current) => ({ ...current, [field]: value }))
    setCodingMessage('')
  }

  const submitCodingProfile = async (event) => {
    event.preventDefault()
    setCodingSaving(true)
    setCodingMessage('')
    try {
      const saved = await saveCompetitiveCodingProfile(codingProfile)
      setCodingProfile({
        codeforces: saved.codeforces ?? '',
        codechef: saved.codechef ?? '',
        leetcode: saved.leetcode ?? '',
      })
      setCodingMessage('Competitive coding profiles saved.')
    } catch (error) {
      setCodingMessage(error.message)
    } finally {
      setCodingSaving(false)
    }
  }

  const toggleGithub = async () => {
    setGithubBusy(true)
    setGithubMessage('')
    try {
      if (githubConnected) {
        await disconnectGithub()
        setGithubConnected(false)
        setGithubMessage('GitHub disconnected.')
      } else {
        await beginGithubOAuth()
      }
    } catch (error) {
      setGithubMessage(error.message)
      setGithubBusy(false)
    }
  }

  const addGoogleCalendarAccount = async () => {
    setCalendarBusy(true)
    setCalendarMessage('')
    try {
      await beginGoogleCalendarOAuth()
    } catch (error) {
      setCalendarMessage(error.message || 'Google Calendar could not be connected.')
      setCalendarBusy(false)
    }
  }

  const refreshCalendars = async () => {
    setCalendarBusy(true)
    setCalendarMessage('')
    try {
      const result = await loadGoogleCalendarData()
      setCalendarConnections(result.connections)
      onGoogleCalendarsChange(result.events)
      setCalendarMessage('Calendar events refreshed.')
    } catch (error) {
      setCalendarMessage(error.message)
    } finally {
      setCalendarBusy(false)
    }
  }

  const removeCalendarAccount = async (connection) => {
    setCalendarBusy(true)
    setCalendarMessage('')
    try {
      await removeGoogleCalendarAccount(connection.id)
      const result = await loadGoogleCalendarData()
      setCalendarConnections(result.connections)
      onGoogleCalendarsChange(result.events)
      setCalendarMessage(`${connection.email} disconnected.`)
    } catch (error) {
      setCalendarMessage(error.message)
    } finally {
      setCalendarBusy(false)
    }
  }

  const toggleHackathonSource = async (source) => {
    setHackathonSourceBusy(source.id)
    setHackathonSourceMessage('')
    try {
      const enabled = !source.enabled
      await setHackathonSourceEnabled(source.id, enabled)
      setHackathonSources((current) =>
        current.map((item) =>
          item.id === source.id ? { ...item, enabled } : item,
        ),
      )
      const hackathons = await loadHackathons()
      onHackathonsChange(hackathons)
      setHackathonSourceMessage(
        `${source.name} ${enabled ? 'connected' : 'turned off'}.`,
      )
    } catch (error) {
      setHackathonSourceMessage(error.message)
    } finally {
      setHackathonSourceBusy('')
    }
  }

  const addGmailAccount = async () => {
    setGmailBusy(true)
    setGmailMessage('')
    try {
      await beginGmailOAuth()
    } catch (error) {
      setGmailMessage(error.message || 'Gmail account could not be connected.')
      setGmailBusy(false)
    }
  }

  const removeGmailAccount = async (account) => {
    setGmailBusy(true)
    setGmailMessage('')
    try {
      if (account.id) {
        await disconnectGmailAccount(account.id)
      } else {
        await disconnectGmail()
      }
      clearGmailAuthorization(account.email)
      fetchGmailAccounts()
      setGmailMessage(`Disconnected ${account.email}.`)
    } catch (error) {
      setGmailMessage(error.message || 'Could not disconnect account.')
    } finally {
      setGmailBusy(false)
    }
  }

  const addGoogleChatAccount = async () => {
    setGoogleChatBusy(true)
    setGoogleChatMessage('')
    try {
      await beginGoogleChatOAuth()
    } catch (error) {
      setGoogleChatMessage(error.message || 'Google Chat account could not be connected.')
      setGoogleChatBusy(false)
    }
  }

  const removeGoogleChatAccount = async (account) => {
    setGoogleChatBusy(true)
    setGoogleChatMessage('')
    try {
      if (account.id) {
        await disconnectGoogleChatAccount(account.id)
      }
      fetchGoogleChatAccounts()
      setGoogleChatMessage(`Disconnected Google Chat for ${account.email}.`)
    } catch (error) {
      setGoogleChatMessage(error.message || 'Could not disconnect account.')
    } finally {
      setGoogleChatBusy(false)
    }
  }

  const handleIcsFileUpload = (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target.result
        const calId = `ics-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        const calName = file.name.replace(/\.ics$/i, '')
        const parsed = parseIcsContent(text, calName, calId)
        if (parsed.events.length) {
          if (setImportedIcsCalendars) {
            setImportedIcsCalendars((current) => [...current, parsed.calendar])
          }
          if (setImportedIcsEvents) {
            setImportedIcsEvents((current) => [...current, ...parsed.events])
          }
        }
      }
      reader.readAsText(file)
    })
    event.target.value = ''
  }

  const removeImportedIcsCalendar = (calendarId) => {
    if (setImportedIcsCalendars) {
      setImportedIcsCalendars((current) => current.filter((c) => c.id !== calendarId))
    }
    if (setImportedIcsEvents) {
      setImportedIcsEvents((current) => current.filter((e) => e.calendarId !== calendarId))
    }
  }

  const deleteAccount = async (event) => {
    event.preventDefault()
    if (deleteConfirmation !== user.name) return
    setAccountDeleting(true)
    setAccountDeleteMessage('')
    try {
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
    <section className="setting-page">
      <div className="page-heading">
        <div>
          <p>Account</p>
          <h1>Setting</h1>
        </div>
      </div>

      <div className="setting-section">
        <div className="section-heading">
          <h2>Profile</h2>
          <p>Your personal information and account role.</p>
        </div>

        <ProfileCard user={user} />
      </div>

      <div className="setting-section">
        <div className="section-heading">
          <h2>Apps</h2>
          <p>Connect Google Workspace to use cloud files across StarWaves.</p>
        </div>

        <div className="apps-settings-stack">
          <section className="workspace-settings-card">
          <div className="workspace-settings-header">
            <div>
              <span className="workspace-google-mark">G</span>
              <div>
                <h3>Google Workspace</h3>
                <p>Drive, Docs, Sheets, and Slides</p>
              </div>
            </div>
            <button
              className={workspaceConnected ? 'workspace-connected' : ''}
              onClick={connectWorkspace}
              disabled={connecting}
            >
              {workspaceConnected && <Check size={15} />}
              {connecting
                ? 'Connecting…'
                : workspaceConnected
                  ? 'Disconnect'
                  : 'Connect'}
            </button>
          </div>

          {connectionError && (
            <p className="workspace-connection-error" role="alert">
              {connectionError}
            </p>
          )}

          <div className="workspace-app-list">
            {workspaceApps.map((app) => {
              const Icon = app.icon
              return (
                <a
                  href={app.url}
                  target="_blank"
                  rel="noreferrer"
                  key={app.id}
                >
                  <span><Icon size={17} /></span>
                  <div>
                    <strong>{app.name}</strong>
                    <small>{app.description}</small>
                  </div>
                  <ExternalLink size={15} />
                </a>
              )
            })}
          </div>
          </section>

          <section className="workspace-settings-card google-calendar-settings-card">
            <div className="workspace-settings-header">
              <div>
                <span className="workspace-google-mark">
                  <CalendarDays size={19} />
                </span>
                <div>
                  <h3>Google Calendar</h3>
                  <p>Combine calendars from multiple Google accounts</p>
                </div>
              </div>
              <button onClick={addGoogleCalendarAccount} disabled={calendarBusy}>
                {calendarBusy ? 'Connecting…' : 'Add Google account'}
              </button>
            </div>

            <div className="google-calendar-settings-body">
              {calendarConnections.length ? (
                <>
                  <div className="google-calendar-account-list">
                    {calendarConnections.map((connection) => (
                      <div className="google-calendar-account" key={connection.email}>
                        <span className="google-calendar-avatar">
                          {connection.picture ? (
                            <img src={connection.picture} alt="" />
                          ) : (
                            connection.name[0]?.toUpperCase()
                          )}
                        </span>
                        <div>
                          <strong>{connection.name}</strong>
                          <small>
                            {connection.email} · {connection.calendars.length}{' '}
                            {connection.calendars.length === 1
                              ? 'calendar'
                              : 'calendars'}
                          </small>
                          <div className="google-calendar-chips">
                            {connection.calendars.slice(0, 4).map((calendar) => (
                              <span key={calendar.id}>
                                <i style={{ background: calendar.color }} />
                                {calendar.name}
                              </span>
                            ))}
                            {connection.calendars.length > 4 && (
                              <span>+{connection.calendars.length - 4} more</span>
                            )}
                          </div>
                        </div>
                        <button
                          className="google-calendar-remove"
                          onClick={() => removeCalendarAccount(connection)}
                          aria-label={`Disconnect ${connection.email}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="google-calendar-refresh"
                    onClick={refreshCalendars}
                    disabled={calendarBusy}
                  >
                    <RefreshCw size={14} />
                    Refresh all calendars
                  </button>
                </>
              ) : (
                <p className="google-calendar-empty">
                  Add a Google account to import its visible calendars. Add
                  another account to merge both into the StarWaves calendar.
                </p>
              )}
              {calendarMessage && <strong role="status">{calendarMessage}</strong>}
            </div>
          </section>

          <section className="workspace-settings-card ics-calendar-settings-card">
            <div className="workspace-settings-header">
              <div>
                <span className="workspace-google-mark"><FileUp size={19} /></span>
                <div>
                  <h3>Imported Calendar Files (.ics)</h3>
                  <p>Import multiple iCal / .ics files to view external calendar events</p>
                </div>
              </div>
              <label className="ics-upload-button">
                <Upload size={15} />
                <span>Import .ics file</span>
                <input
                  type="file"
                  accept=".ics,text/calendar"
                  multiple
                  onChange={handleIcsFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div className="google-calendar-settings-body">
              {importedIcsCalendars.length ? (
                <div className="google-calendar-account-list">
                  {importedIcsCalendars.map((cal) => (
                    <div className="google-calendar-account" key={cal.id}>
                      <span className="google-calendar-avatar">
                        <FileUp size={16} />
                      </span>
                      <div>
                        <strong>{cal.name}</strong>
                        <small>{cal.eventCount} {cal.eventCount === 1 ? 'event' : 'events'} imported</small>
                      </div>
                      <button
                        className="google-calendar-remove"
                        onClick={() => removeImportedIcsCalendar(cal.id)}
                        aria-label={`Remove ${cal.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="google-calendar-empty">
                  Upload .ics calendar files from Apple Calendar, Outlook, or Google Calendar exports.
                </p>
              )}
            </div>
          </section>

          <section className="workspace-settings-card gmail-settings-card">
            <div className="workspace-settings-header">
              <div>
                <span className="workspace-google-mark"><Mail size={19} /></span>
                <div>
                  <h3>Google Mail</h3>
                  <p>Connect and switch between multiple Gmail accounts</p>
                </div>
              </div>
              <button onClick={addGmailAccount} disabled={gmailBusy}>
                {gmailBusy ? 'Connecting…' : 'Add Gmail account'}
              </button>
            </div>
            <div className="google-calendar-settings-body">
              {gmailAccounts.length ? (
                <div className="google-calendar-account-list">
                  {gmailAccounts.map((acc) => (
                    <div className="google-calendar-account" key={acc.id || acc.email}>
                      <span className="google-calendar-avatar">
                        <Mail size={16} />
                      </span>
                      <div>
                        <strong>{acc.email}</strong>
                        <small>Gmail connected</small>
                      </div>
                      <button
                        className="google-calendar-remove"
                        onClick={() => removeGmailAccount(acc)}
                        aria-label={`Disconnect ${acc.email}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="google-calendar-empty">
                  Connect one or more Gmail accounts to read and send email directly within StarWaves.
                </p>
              )}
              {gmailMessage && <strong role="status">{gmailMessage}</strong>}
            </div>
          </section>

          <section className="workspace-settings-card google-chat-settings-card">
            <div className="workspace-settings-header">
              <div>
                <span className="workspace-google-mark"><MessageSquare size={19} /></span>
                <div>
                  <h3>Google Chat</h3>
                  <p>Connect and manage multiple Google Chat accounts</p>
                </div>
              </div>
              <button onClick={addGoogleChatAccount} disabled={googleChatBusy}>
                {googleChatBusy ? 'Connecting…' : 'Add Google Chat account'}
              </button>
            </div>
            <div className="google-calendar-settings-body">
              {googleChatAccounts.length ? (
                <div className="google-calendar-account-list">
                  {googleChatAccounts.map((acc) => (
                    <div className="google-calendar-account" key={acc.id || acc.email}>
                      <span className="google-calendar-avatar">
                        <MessageSquare size={16} />
                      </span>
                      <div>
                        <strong>{acc.display_name || acc.email}</strong>
                        <small>{acc.email} · Google Chat connected</small>
                      </div>
                      <button
                        className="google-calendar-remove"
                        onClick={() => removeGoogleChatAccount(acc)}
                        aria-label={`Disconnect ${acc.email}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="google-calendar-empty">
                  Connect one or more Google Chat accounts to view spaces, direct messages, and chat across accounts.
                </p>
              )}
              {googleChatMessage && <strong role="status">{googleChatMessage}</strong>}
            </div>
          </section>

          <section className="workspace-settings-card github-settings-card">
          <div className="workspace-settings-header">
            <div>
              <span className="workspace-google-mark"><GitFork size={19} /></span>
              <div>
                <h3>GitHub</h3>
                <p>Import repositories and live contribution stats</p>
              </div>
            </div>
            <button
              className={githubConnected ? 'workspace-connected' : ''}
              onClick={toggleGithub}
              disabled={githubBusy}
            >
              {githubConnected && <Check size={15} />}
              {githubBusy
                ? 'Working…'
                : githubConnected
                  ? 'Disconnect'
                  : 'Connect'}
            </button>
          </div>
          <div className="github-settings-copy">
            <p>
              Connected repositories become StarWaves projects. GitHub activity
              replaces placeholder statistics.
            </p>
            {githubMessage && <strong role="status">{githubMessage}</strong>}
          </div>
          </section>
        </div>
      </div>

      <div className="setting-section">
        <div className="section-heading">
          <h2>Competitive coding</h2>
          <p>Add a username or full profile URL for each coding platform.</p>
        </div>

        <form
          className="coding-settings-card"
          onSubmit={submitCodingProfile}
        >
          <div className="coding-settings-header">
            <span><Code2 size={18} /></span>
            <div>
              <h3>Coding profiles</h3>
              <p>These IDs will be used for your stats and contest activity.</p>
            </div>
          </div>

          <div className="coding-profile-fields">
            <label>
              <span><strong>Codeforces</strong><small>Handle or profile URL</small></span>
              <input
                value={codingProfile.codeforces}
                onChange={(event) =>
                  updateCodingField('codeforces', event.target.value)
                }
                placeholder="tourist or codeforces.com/profile/tourist"
              />
            </label>
            <label>
              <span><strong>CodeChef</strong><small>Username or profile URL</small></span>
              <input
                value={codingProfile.codechef}
                onChange={(event) =>
                  updateCodingField('codechef', event.target.value)
                }
                placeholder="username or codechef.com/users/username"
              />
            </label>
            <label>
              <span><strong>LeetCode</strong><small>Username or profile URL</small></span>
              <input
                value={codingProfile.leetcode}
                onChange={(event) =>
                  updateCodingField('leetcode', event.target.value)
                }
                placeholder="username or leetcode.com/u/username"
              />
            </label>
          </div>

          <div className="coding-settings-footer">
            {codingMessage && (
              <p role="status">{codingMessage}</p>
            )}
            <button type="submit" disabled={codingSaving}>
              <Save size={15} />
              {codingSaving ? 'Saving…' : 'Save profiles'}
            </button>
          </div>
        </form>
      </div>

      <div className="setting-section">
        <div className="section-heading">
          <h2>Hackathons</h2>
          <p>Turn on event sources to combine their active hackathons.</p>
        </div>

        <div className="hackathon-source-settings">
          <div className="hackathon-source-heading">
            <span><Globe2 size={18} /></span>
            <div>
              <h3>Hackathon sources</h3>
              <p>Connected sources automatically update your Hackathons page.</p>
            </div>
          </div>

          <div className="hackathon-source-list">
            {hackathonSources.map((source) => (
              <div className="hackathon-source-row" key={source.id}>
                <span className={`hackathon-source-logo ${source.id}`}>
                  {source.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>{source.name}</strong>
                  <small>{source.description}</small>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    Visit site <ExternalLink size={11} />
                  </a>
                </div>
                <button
                  className={source.enabled ? 'enabled' : ''}
                  onClick={() => toggleHackathonSource(source)}
                  disabled={hackathonSourceBusy === source.id}
                  aria-pressed={source.enabled}
                >
                  <i />
                  {hackathonSourceBusy === source.id
                    ? 'Updating…'
                    : source.enabled
                      ? 'Disconnect'
                      : 'Connect'}
                </button>
              </div>
            ))}
          </div>
          {hackathonSourceMessage && (
            <p className="hackathon-source-message" role="status">
              {hackathonSourceMessage}
            </p>
          )}
        </div>
      </div>

      <div className="setting-section delete-account-section">
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

            <form onSubmit={deleteAccount}>
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
    </section>
  )
}
