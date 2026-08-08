import { useEffect, useState } from 'react'
import {
  Check,
  CalendarDays,
  Clock,
  Code2,
  ExternalLink,
  FileText,
  HardDrive,
  Globe2,
  Mail,
  MessageSquare,
  GitFork,
  Plus,
  Presentation,
  RefreshCw,
  Save,
  Send,
  Sheet,
  Smartphone,
  Trash2,
  Upload,
  FileUp,
  Palette,
} from 'lucide-react'
import { ProfileCard } from '../components/ProfileCard'
import { ConfirmDialog } from '../components/ui'
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
  loadContests,
  loadHackathons,
  loadHackathonSources,
  setHackathonSourceEnabled,
  sendCalendarReminderTest,
  getRegisteredDevices,
  registerDeviceToken,
  unregisterDeviceToken,
  sendPushNotification,
  queueNotification,
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

const CONTEST_PLATFORMS = [
  {
    id: 'codeforces',
    name: 'Codeforces',
    shortName: 'CF',
    description: 'Upcoming contests, rounds, and division challenges.',
    url: 'https://codeforces.com',
  },
  {
    id: 'codechef',
    name: 'CodeChef',
    shortName: 'CC',
    description: 'Starters, Long Challenges, and Cook-Offs.',
    url: 'https://www.codechef.com',
  },
  {
    id: 'leetcode',
    name: 'LeetCode',
    shortName: 'LC',
    description: 'Weekly & Biweekly contests with Global Leaderboards.',
    url: 'https://leetcode.com/contest',
  },
]

export function SettingPage({
  user,
  onNavigate,
  onGoogleCalendarsChange,
  onHackathonsChange,
  onContestSitesChange,
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
  const [disconnectRequest, setDisconnectRequest] = useState(null)
  const [enabledContestPlatforms, setEnabledContestPlatforms] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('starwaves-enabled-contest-platforms') ??
          '["codeforces","codechef","leetcode"]',
      )
    } catch {
      return ['codeforces', 'codechef', 'leetcode']
    }
  })
  const [contestPlatformMessage, setContestPlatformMessage] = useState('')
  const [calendarReminderTestBusy, setCalendarReminderTestBusy] = useState(false)
  const [calendarReminderTestMessage, setCalendarReminderTestMessage] = useState('')

  const [devices, setDevices] = useState([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [deviceMessage, setDeviceMessage] = useState('')
  const [deviceTokenInput, setDeviceTokenInput] = useState('')
  const [deviceNameInput, setDeviceNameInput] = useState('')
  const [pushTitle, setPushTitle] = useState('StarWaves Alert')
  const [pushBody, setPushBody] = useState('Your project deadline is approaching!')
  const [pushSending, setPushSending] = useState(false)
  const [scheduledTitle, setScheduledTitle] = useState('StarWaves Task Reminder')
  const [scheduledBody, setScheduledBody] = useState('Submit code review report')
  const [scheduledMinutes, setScheduledMinutes] = useState('5')
  const [scheduledQueueing, setScheduledQueueing] = useState(false)

  const fetchRegisteredDevices = async () => {
    setDevicesLoading(true)
    try {
      const data = await getRegisteredDevices()
      setDevices(data.devices || [])
    } catch (err) {
      setDeviceMessage(err.message || 'Could not load devices.')
    } finally {
      setDevicesLoading(false)
    }
  }

  const handleRegisterDeviceToken = async (e) => {
    e?.preventDefault()
    if (!deviceTokenInput.trim()) {
      setDeviceMessage('Token string is required.')
      return
    }
    setDevicesLoading(true)
    setDeviceMessage('')
    try {
      await registerDeviceToken(deviceTokenInput.trim(), deviceNameInput.trim() || 'My Device')
      setDeviceMessage('Device token registered successfully.')
      setDeviceTokenInput('')
      setDeviceNameInput('')
      await fetchRegisteredDevices()
    } catch (err) {
      setDeviceMessage(err.message || 'Could not register token.')
    } finally {
      setDevicesLoading(false)
    }
  }

  const handleUnregisterDeviceToken = async (tokenId) => {
    setDevicesLoading(true)
    setDeviceMessage('')
    try {
      await unregisterDeviceToken(tokenId)
      setDeviceMessage('Device token unregistered successfully.')
      await fetchRegisteredDevices()
    } catch (err) {
      setDeviceMessage(err.message || 'Could not unregister token.')
    } finally {
      setDevicesLoading(false)
    }
  }

  const handleSendPush = async (e) => {
    e?.preventDefault()
    if (!pushTitle.trim() || !pushBody.trim()) {
      setDeviceMessage('Push title and body are required.')
      return
    }
    setPushSending(true)
    setDeviceMessage('')
    try {
      const res = await sendPushNotification(
        pushTitle.trim(),
        pushBody.trim(),
        { source: 'settings-test' },
      )
      setDeviceMessage(`Push sent successfully! Status: ${res.status || 'sent'}`)
    } catch (err) {
      setDeviceMessage(err.message || 'Failed to send push notification.')
    } finally {
      setPushSending(false)
    }
  }

  const handleQueuePush = async (e) => {
    e?.preventDefault()
    if (!scheduledTitle.trim() || !scheduledBody.trim()) {
      setDeviceMessage('Scheduled title and body are required.')
      return
    }
    setScheduledQueueing(true)
    setDeviceMessage('')
    try {
      const minutes = Math.max(1, parseInt(scheduledMinutes, 10) || 5)
      const scheduledAt = new Date(Date.now() + minutes * 60 * 1000).toISOString()
      const res = await queueNotification(
        scheduledTitle.trim(),
        scheduledBody.trim(),
        scheduledAt,
        { source: 'settings-queued' },
      )
      setDeviceMessage(`Notification queued successfully! ID: ${res.id}`)
    } catch (err) {
      setDeviceMessage(err.message || 'Failed to queue notification.')
    } finally {
      setScheduledQueueing(false)
    }
  }

  const triggerTestCalendarReminder = async (window = '1h') => {
    setCalendarReminderTestBusy(true)
    setCalendarReminderTestMessage('')
    try {
      const res = await sendCalendarReminderTest(window, 'Calendar Sync & Review')
      setCalendarReminderTestMessage(res.message || 'Test reminder email dispatched.')
    } catch (err) {
      setCalendarReminderTestMessage(err.message || 'Could not send test reminder.')
    } finally {
      setCalendarReminderTestBusy(false)
    }
  }

  const toggleContestPlatform = async (platformId) => {
    const nextEnabled = enabledContestPlatforms.includes(platformId)
      ? enabledContestPlatforms.filter((id) => id !== platformId)
      : [...enabledContestPlatforms, platformId]

    setEnabledContestPlatforms(nextEnabled)
    try {
      localStorage.setItem(
        'starwaves-enabled-contest-platforms',
        JSON.stringify(nextEnabled),
      )
    } catch {
      // ignore
    }

    const platformName =
      CONTEST_PLATFORMS.find((p) => p.id === platformId)?.name || platformId
    const isNowEnabled = nextEnabled.includes(platformId)
    setContestPlatformMessage(
      `${platformName} contest details ${isNowEnabled ? 'turned on' : 'turned off'}.`,
    )

    if (onContestSitesChange) {
      try {
        const rawContests = await loadContests()
        const sites = rawContests.items.reduce((groups, contest) => {
          const site = groups.find((item) => item.id === contest.platformId)
          if (site) site.contests.push(contest)
          else groups.push({ id: contest.platformId, name: contest.platformId, shortName: contest.platformId.slice(0, 2).toUpperCase(), description: 'Upcoming contests.', contests: [contest] })
          return groups
        }, [])
        onContestSitesChange(sites.filter((site) => nextEnabled.includes(site.id)))
      } catch (err) {
        console.error('Could not refresh contest platforms:', err)
      }
    }
  }

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
    fetchRegisteredDevices()
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
        const { connected } = await getGoogleDriveStatus()
        setWorkspaceConnected(connected)
      }
    } catch (error) {
      setConnectionError(error.message || 'Google Workspace could not be connected.')
    } finally {
      setConnecting(false)
    }
  }

  const addWorkspaceAccount = async () => {
    setConnecting(true)
    setConnectionError('')
    try {
      await beginGoogleDriveOAuth()
      const { connected } = await getGoogleDriveStatus()
      setWorkspaceConnected(connected)
    } catch (error) {
      setConnectionError(error.message || 'Google Workspace account could not be connected.')
    } finally {
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
      const data = await loadGoogleCalendarData()
      setCalendarConnections(data.connections)
      onGoogleCalendarsChange(data.events)
    } catch (error) {
      setCalendarMessage(error.message || 'Google Calendar could not be connected.')
    } finally {
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

  const disconnectAllCalendarAccounts = async () => {
    setCalendarBusy(true)
    setCalendarMessage('')
    try {
      await Promise.all(calendarConnections.map((c) => removeGoogleCalendarAccount(c.id)))
      setCalendarConnections([])
      onGoogleCalendarsChange([])
      setCalendarMessage('All Google Calendar accounts disconnected.')
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
      onHackathonsChange(hackathons.items)
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
      fetchGmailAccounts()
    } catch (error) {
      setGmailMessage(error.message || 'Gmail account could not be connected.')
    } finally {
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

  const disconnectAllGmailAccounts = async () => {
    setGmailBusy(true)
    setGmailMessage('')
    try {
      await Promise.all(
        gmailAccounts.map((acc) =>
          acc.id ? disconnectGmailAccount(acc.id) : disconnectGmail(),
        ),
      )
      gmailAccounts.forEach((acc) => clearGmailAuthorization(acc.email))
      setGmailAccounts([])
      setGmailMessage('All Gmail accounts disconnected.')
    } catch (error) {
      setGmailMessage(error.message || 'Could not disconnect accounts.')
    } finally {
      setGmailBusy(false)
    }
  }

  const addGoogleChatAccount = async () => {
    setGoogleChatBusy(true)
    setGoogleChatMessage('')
    try {
      await beginGoogleChatOAuth()
      fetchGoogleChatAccounts()
    } catch (error) {
      setGoogleChatMessage(error.message || 'Google Chat account could not be connected.')
    } finally {
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

  const disconnectAllGoogleChatAccounts = async () => {
    setGoogleChatBusy(true)
    setGoogleChatMessage('')
    try {
      await Promise.all(
        googleChatAccounts
          .filter((acc) => acc.id)
          .map((acc) => disconnectGoogleChatAccount(acc.id)),
      )
      setGoogleChatAccounts([])
      setGoogleChatMessage('All Google Chat accounts disconnected.')
    } catch (error) {
      setGoogleChatMessage(error.message || 'Could not disconnect accounts.')
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

  const requestDisconnect = (kind, item = null) => setDisconnectRequest({ kind, item })

  const confirmDisconnect = async () => {
    const request = disconnectRequest
    setDisconnectRequest(null)
    if (!request) return
    if (request.kind === 'workspace') return connectWorkspace()
    if (request.kind === 'github') return toggleGithub()
    if (request.kind === 'calendar-all') return disconnectAllCalendarAccounts()
    if (request.kind === 'calendar') return removeCalendarAccount(request.item)
    if (request.kind === 'gmail-all') return disconnectAllGmailAccounts()
    if (request.kind === 'gmail') return removeGmailAccount(request.item)
    if (request.kind === 'chat-all') return disconnectAllGoogleChatAccounts()
    if (request.kind === 'chat') return removeGoogleChatAccount(request.item)
  }

  return (
    <section className="setting-page">
      <div className="page-heading">
        <div>
          <p>Account</p>
          <h1>Settings</h1>
        </div>
      </div>

      <nav className="settings-section-nav" aria-label="Settings sections">
        <a href="#settings-profile">Profile</a>
        <a href="#settings-themes">Themes &amp; Appearance</a>
        <a href="#settings-apps">Integrations</a>
        <a href="#settings-sources">Data sources</a>
        <a href="#settings-coding">Coding profiles</a>
        <a href="#settings-account">Account &amp; security</a>
      </nav>

      <div className="setting-section" id="settings-profile">
        <div className="section-heading">
          <h2>Profile</h2>
          <p>Your personal information and account role.</p>
        </div>

        <ProfileCard user={user} />
      </div>

      <div className="setting-section" id="settings-themes">
        <div className="section-heading">
          <h2>Themes &amp; Appearance</h2>
          <p>Customize presets and colors for all UI elements across every page in StarWaves.</p>
        </div>

        <div className="workspace-settings-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="workspace-google-mark" style={{ background: 'var(--bg-tertiary, #e4e4e7)', color: 'var(--text-primary, #09090b)' }}>
              <Palette size={20} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #09090b)' }}>Color Theme Customizer</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: 'var(--text-muted, #71717a)' }}>
                Customize element backgrounds, card surfaces, text, primary buttons, borders, and scrollbars.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={() => onNavigate && onNavigate('themes')}
            style={{ padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <Palette size={16} /> Open Themes Page
          </button>
        </div>
      </div>

      <div className="setting-section" id="settings-apps">
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
              onClick={workspaceConnected ? () => requestDisconnect('workspace') : connectWorkspace}
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
          {workspaceConnected && (
            <button
              className="google-calendar-add-account workspace-add-account"
              onClick={addWorkspaceAccount}
              disabled={connecting}
            >
              {connecting ? 'Connecting…' : 'Add another account'}
            </button>
          )}
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
              <button
                className={calendarConnections.length > 0 ? 'workspace-connected' : ''}
                onClick={calendarConnections.length > 0 ? () => requestDisconnect('calendar-all') : addGoogleCalendarAccount}
                disabled={calendarBusy}
              >
                {calendarConnections.length > 0 && <Check size={15} />}
                {calendarBusy
                  ? calendarConnections.length > 0 ? 'Disconnecting…' : 'Connecting…'
                  : calendarConnections.length > 0
                    ? 'Disconnect'
                    : 'Add Google account'}
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
                          onClick={() => requestDisconnect('calendar', connection)}
                          aria-label={`Disconnect ${connection.email}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="google-calendar-actions">
                    <button className="google-calendar-refresh" onClick={refreshCalendars} disabled={calendarBusy}>
                      <RefreshCw size={14} />
                      Refresh all calendars
                    </button>
                    <button className="google-calendar-add-account" onClick={addGoogleCalendarAccount} disabled={calendarBusy}>
                      Add another account
                    </button>
                  </div>
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
              <button
                className={gmailAccounts.length > 0 ? 'workspace-connected' : ''}
                onClick={gmailAccounts.length > 0 ? () => requestDisconnect('gmail-all') : addGmailAccount}
                disabled={gmailBusy}
              >
                {gmailAccounts.length > 0 && <Check size={15} />}
                {gmailBusy
                  ? gmailAccounts.length > 0 ? 'Disconnecting…' : 'Connecting…'
                  : gmailAccounts.length > 0
                    ? 'Disconnect'
                    : 'Add Gmail account'}
              </button>
            </div>
            <div className="google-calendar-settings-body">
              {gmailAccounts.length ? (
                <>
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
                        onClick={() => requestDisconnect('gmail', acc)}
                        aria-label={`Disconnect ${acc.email}`}
                      >
                        <Trash2 size={15} />
                      </button>
                      </div>
                    ))}
                  </div>
                  <button className="google-calendar-add-account" onClick={addGmailAccount} disabled={gmailBusy}>
                    Add another account
                  </button>
                </>
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
              <button
                className={googleChatAccounts.length > 0 ? 'workspace-connected' : ''}
                onClick={googleChatAccounts.length > 0 ? () => requestDisconnect('chat-all') : addGoogleChatAccount}
                disabled={googleChatBusy}
              >
                {googleChatAccounts.length > 0 && <Check size={15} />}
                {googleChatBusy
                  ? googleChatAccounts.length > 0 ? 'Disconnecting…' : 'Connecting…'
                  : googleChatAccounts.length > 0
                    ? 'Disconnect'
                    : 'Add Google Chat account'}
              </button>
            </div>
            <div className="google-calendar-settings-body">
              {googleChatAccounts.length ? (
                <>
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
                        onClick={() => requestDisconnect('chat', acc)}
                        aria-label={`Disconnect ${acc.email}`}
                      >
                        <Trash2 size={15} />
                      </button>
                      </div>
                    ))}
                  </div>
                  <button className="google-calendar-add-account" onClick={addGoogleChatAccount} disabled={googleChatBusy}>
                    Add another account
                  </button>
                </>
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
              onClick={githubConnected ? () => requestDisconnect('github') : toggleGithub}
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

      <div className="setting-section" id="settings-sources">
        <div className="section-heading">
          <h2>Data sources &amp; Reminders</h2>
          <p>Manage imported calendars, external activity sources, and automated email reminders.</p>
        </div>
        <div className="workspace-settings-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span className="workspace-google-mark">
                <Mail size={19} />
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #09090b)' }}>Automated Calendar Email Reminders</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: 'var(--text-muted, #71717a)' }}>
                  Sends email reminders for all Google Calendar events, tasks, contests, and job deadlines <strong>next day (24h ahead)</strong> and <strong>1 hour before</strong> start time.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="google-calendar-refresh"
                onClick={() => triggerTestCalendarReminder('1h')}
                disabled={calendarReminderTestBusy}
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              >
                <Mail size={13} /> Send Test 1-Hour Reminder
              </button>
              <button
                type="button"
                className="google-calendar-add-account"
                onClick={() => triggerTestCalendarReminder('next_day')}
                disabled={calendarReminderTestBusy}
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              >
                <Mail size={13} /> Send Test Next-Day Reminder
              </button>
            </div>
          </div>
          {calendarReminderTestMessage && (
            <p className="hackathon-source-message" role="status" style={{ margin: 0 }}>
              {calendarReminderTestMessage}
            </p>
          )}
        </div>
      </div>

      <div className="setting-section" id="settings-push-notifications">
        <div className="section-heading">
          <h2>Push Notifications &amp; Devices</h2>
          <p>Register device FCM tokens, send real-time push notifications, and schedule queued background alerts.</p>
        </div>

        <div className="workspace-settings-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #09090b)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={18} /> Registered User Devices
              </h3>
              <button
                type="button"
                className="google-calendar-refresh"
                onClick={fetchRegisteredDevices}
                disabled={devicesLoading}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <RefreshCw size={13} className={devicesLoading ? 'spin' : ''} /> Refresh Devices
              </button>
            </div>

            {devices.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted, #71717a)' }}>
                No device tokens registered yet. Register a device FCM token below to receive push notifications.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {devices.map((dev) => (
                  <div
                    key={dev.token_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #27272a)',
                      backgroundColor: 'var(--bg-secondary, #121212)',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.9rem', display: 'block', color: 'var(--text-primary, #ffffff)' }}>
                        {dev.device_name}
                      </strong>
                      <code style={{ fontSize: '0.78rem', color: 'var(--text-muted, #71717a)' }}>
                        Token: {dev.token_preview}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnregisterDeviceToken(dev.token_id)}
                      disabled={devicesLoading}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color, #27272a)',
                        color: 'var(--text-primary, #ffffff)',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                      }}
                    >
                      <Trash2 size={13} /> Unregister
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color, #27272a)', margin: '0' }} />

          <form onSubmit={handleRegisterDeviceToken} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #09090b)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> Register Device Token
            </h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Device Name (e.g. Chrome Browser, Android Phone)"
                value={deviceNameInput}
                onChange={(e) => setDeviceNameInput(e.target.value)}
                style={{
                  flex: '1 1 200px',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color, #27272a)',
                  backgroundColor: 'var(--bg-input, #09090b)',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: '0.85rem',
                }}
              />
              <input
                type="text"
                placeholder="FCM Device Token String"
                value={deviceTokenInput}
                onChange={(e) => setDeviceTokenInput(e.target.value)}
                style={{
                  flex: '2 1 300px',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color, #27272a)',
                  backgroundColor: 'var(--bg-input, #09090b)',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: '0.85rem',
                }}
              />
              <button
                type="submit"
                className="google-calendar-add-account"
                disabled={devicesLoading}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <Plus size={14} /> Register Token
              </button>
            </div>
          </form>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color, #27272a)', margin: '0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <form onSubmit={handleSendPush} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #09090b)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} /> Instant Push Test
              </h3>
              <input
                type="text"
                placeholder="Push Title"
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color, #27272a)',
                  backgroundColor: 'var(--bg-input, #09090b)',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: '0.85rem',
                }}
              />
              <textarea
                placeholder="Push Message Body"
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                rows={2}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color, #27272a)',
                  backgroundColor: 'var(--bg-input, #09090b)',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: '0.85rem',
                  resize: 'none',
                }}
              />
              <button
                type="submit"
                className="google-calendar-add-account"
                disabled={pushSending}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <Send size={13} /> Send Instant Push
              </button>
            </form>

            <form onSubmit={handleQueuePush} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #09090b)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} /> Queue Scheduled Push
              </h3>
              <input
                type="text"
                placeholder="Scheduled Title"
                value={scheduledTitle}
                onChange={(e) => setScheduledTitle(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color, #27272a)',
                  backgroundColor: 'var(--bg-input, #09090b)',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: '0.85rem',
                }}
              />
              <textarea
                placeholder="Scheduled Message Body"
                value={scheduledBody}
                onChange={(e) => setScheduledBody(e.target.value)}
                rows={2}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color, #27272a)',
                  backgroundColor: 'var(--bg-input, #09090b)',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: '0.85rem',
                  resize: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted, #71717a)' }}>Send in:</span>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={scheduledMinutes}
                  onChange={(e) => setScheduledMinutes(e.target.value)}
                  style={{
                    width: '70px',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color, #27272a)',
                    backgroundColor: 'var(--bg-input, #09090b)',
                    color: 'var(--text-primary, #ffffff)',
                    fontSize: '0.85rem',
                  }}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted, #71717a)' }}>minutes</span>
              </div>
              <button
                type="submit"
                className="google-calendar-refresh"
                disabled={scheduledQueueing}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <Clock size={13} /> Queue Notification
              </button>
            </form>
          </div>

          {deviceMessage && (
            <p className="hackathon-source-message" role="status" style={{ margin: 0 }}>
              {deviceMessage}
            </p>
          )}
        </div>
      </div>

      <div className="setting-section" id="settings-coding">
        <div className="section-heading">
          <h2>Competitive coding</h2>
          <p>Add a username or full profile URL for each coding platform.</p>
        </div>

        <div className="setting-content-stack">
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

          <div className="hackathon-source-settings">
            <div className="hackathon-source-heading">
              <span><Code2 size={18} /></span>
              <div>
                <h3>Contest platforms & details</h3>
                <p>Turn on or off upcoming contest details from specific platform sources.</p>
              </div>
            </div>

            <div className="hackathon-source-list">
              {CONTEST_PLATFORMS.map((platform) => {
                const isEnabled = enabledContestPlatforms.includes(platform.id)
                return (
                  <div className="hackathon-source-row" key={platform.id}>
                    <span className={`hackathon-source-logo ${platform.id}`}>
                      {platform.shortName}
                    </span>
                    <div>
                      <strong>{platform.name}</strong>
                      <small>{platform.description}</small>
                      <a href={platform.url} target="_blank" rel="noreferrer">
                        Visit site <ExternalLink size={11} />
                      </a>
                    </div>
                    <button
                      className={isEnabled ? 'enabled' : ''}
                      onClick={() => toggleContestPlatform(platform.id)}
                      aria-pressed={isEnabled}
                    >
                      <i />
                      {isEnabled ? 'Turn off' : 'Turn on'}
                    </button>
                  </div>
                )
              })}
            </div>
            {contestPlatformMessage && (
              <p className="hackathon-source-message" role="status">
                {contestPlatformMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="setting-section" id="settings-hackathons">
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

      <ConfirmDialog
        isOpen={Boolean(disconnectRequest)}
        title="Disconnect integration?"
        message={disconnectRequest?.item?.email
          ? `Disconnect ${disconnectRequest.item.email} from StarWaves? You can reconnect it later.`
          : 'Disconnect this integration from StarWaves? You can reconnect it later.'}
        confirmLabel="Disconnect"
        onCancel={() => setDisconnectRequest(null)}
        onConfirm={confirmDisconnect}
      />
    </section>
  )
}
