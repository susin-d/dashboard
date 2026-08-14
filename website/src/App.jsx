import { useEffect, useMemo, useRef, useState } from 'react'
import { AppLayout } from './layouts/AppLayout'
import { CalendarPage } from './pages/CalendarPage'
import { CompetitiveCodingPage } from './pages/CompetitiveCodingPage'
import { DashboardPage } from './pages/DashboardPage'
import { EvePage } from './pages/EvePage'
import { DocumentsPage } from './pages/DocumentsPage'
import { DocumentOpenerPage } from './pages/DocumentOpenerPage'
import { HackathonsPage } from './pages/HackathonsPage'
import { HackathonDetailPage } from './pages/HackathonDetailPage'
import { JobsPage } from './pages/JobsPage'
import { MailsPage } from './pages/MailsPage'
import { ChatsPage } from './pages/ChatsPage'
import { CallsPage } from './pages/CallsPage'
import { IncomingCallOverlay } from './components/calls/IncomingCallOverlay'
import { ProfilePage } from './pages/ProfilePage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SettingPage } from './pages/SettingPage'
import { ThemesPage } from './pages/ThemesPage'
import { StatsPage } from './pages/StatsPage'
import { TodoPage } from './pages/TodoPage'
import { AuthPage } from './pages/AuthPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { LandingPage } from './pages/LandingPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { TermsOfServicePage } from './pages/TermsOfServicePage'
import { updateNotification } from './lib/workspaceApi'
import { confirmEmailVerification } from './lib/emailApi'
import { clearAuthSession, verifyAccountCombine } from './lib/authApi'
import { CALENDAR_REMINDER_PREFIX } from './utils/calendarReminders'
import { useAuth, useRouter, useWorkspaceData, useCallCenter } from './hooks'
import { applyThemeVariables } from './themes'
import { NetworkStatus } from './components/NetworkStatus'
import { WaveLoader } from './components/WaveLoader'
import { useDialogAccessibility } from './hooks/useDialogAccessibility'

const routeTitles = {
  '/': 'StarWaves — Developer productivity workspace',
  '/login': 'Log in — StarWaves',
  '/signup': 'Create account — StarWaves',
  '/forgot-password': 'Forgot password — StarWaves',
  '/onboarding': 'Set up your workspace — StarWaves',
  '/privacy': 'Privacy policy — StarWaves',
  '/terms': 'Terms of service — StarWaves',
}

function publicRoute(content) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <NetworkStatus />
      {content}
    </>
  )
}

function App() {
  useDialogAccessibility()
  const { currentUser, authReady } = useAuth()
  const [sessionUser, setSessionUser] = useState(null)
  const activeUser = currentUser || sessionUser
  const callCenter = useCallCenter({ user: activeUser })

  const resetToken = (() => {
    const hash = window.location.hash || ''
    const search = window.location.search || ''
    const full = hash + search
    if (full.includes('reset-token=')) {
      const val = full.split('reset-token=')[1] || ''
      return decodeURIComponent(val.split('&')[0] || '').trim() || null
    }
    if (full.includes('reset_token=')) {
      const val = full.split('reset_token=')[1] || ''
      return decodeURIComponent(val.split('&')[0] || '').trim() || null
    }
    if (search.includes('token=')) {
      const val = search.split('token=')[1] || ''
      return decodeURIComponent(val.split('&')[0] || '').trim() || null
    }
    return null
  })()

  const {
    route,
    setRoute,
    activePage,
    setActivePage,
    selectedProjectId,
    setSelectedProjectId,
    selectedDocumentId,
    selectedHackathonId,
    navigate,
  } = useRouter()

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0)
  const [creationIntent, setCreationIntent] = useState(null)
  const [eveChatKey, setEveChatKey] = useState(0)

  const {
    projects,
    setProjects,
    jobs,
    setJobs,
    documents,
    setDocuments,
    codingStats,
    tasks,
    setTasks,
    notifications,
    setNotifications,
    contestSites,
    setContestSites,
    hackathons,
    setHackathons,
    googleCalendarEvents,
    setGoogleCalendarEvents,
    importedIcsCalendars,
    setImportedIcsCalendars,
    importedIcsEvents,
    setImportedIcsEvents,
    calendarEventIndex,
    pagination,
    loadingMore,
    loadMore,
  } = useWorkspaceData(activeUser, activePage, workspaceRefreshKey)

  const previousRouteRef = useRef(route)

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId)
  const selectedHackathon = hackathons.find((hackathon) => hackathon.id === selectedHackathonId)

  useEffect(() => {
    const pageName = activePage
      .split('-')
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' ')
    document.title = routeTitles[route] ?? `${pageName} — StarWaves`

    if (previousRouteRef.current !== route) {
      window.requestAnimationFrame(() => {
        const main = document.getElementById('main-content')
        main?.focus({ preventScroll: true })
      })
      previousRouteRef.current = route
    }
  }, [activePage, route])

  useEffect(() => {
    const hash = window.location.hash || ''
    if (hash.includes('#combine-account?token=')) {
      const token = decodeURIComponent(hash.split('#combine-account?token=')[1] || '').trim()
      if (token) {
        verifyAccountCombine(token)
          .then((res) => {
            alert(res.message || 'Account verification successful! Accounts combined.')
            window.history.replaceState({}, '', window.location.pathname + window.location.search)
            setWorkspaceRefreshKey((prev) => prev + 1)
          })
          .catch((err) => {
            alert(err.message || 'Account combination link invalid or expired.')
            window.history.replaceState({}, '', window.location.pathname + window.location.search)
          })
      }
    } else if (hash.includes('#verify-email?token=')) {
      const token = decodeURIComponent(hash.split('#verify-email?token=')[1] || '').trim()
      if (token) {
        confirmEmailVerification(token)
          .then((res) => {
            alert(res.message || 'Email address verified successfully!')
            window.history.replaceState({}, '', window.location.pathname + window.location.search)
            setWorkspaceRefreshKey((prev) => prev + 1)
          })
          .catch((err) => {
            alert(err.message || 'Verification link invalid or expired.')
            window.history.replaceState({}, '', window.location.pathname + window.location.search)
          })
      }
    }
  }, [])

  useEffect(() => {
    const savedTheme = localStorage.getItem('starwaves.custom_theme')
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme)
        if (parsed && typeof parsed === 'object') {
          applyThemeVariables(parsed)
        }
      } catch (err) {
        console.error('Could not load custom theme:', err)
      }
    }
  }, [])


  useEffect(() => {
    if (
      authReady &&
      activeUser &&
      !resetToken &&
      (route === '/' || route === '/login' || route === '/signup' || route === '/forgot-password')
    ) {
      window.history.replaceState({}, '', '/app/dashboard')
      setRoute('/app/dashboard')
      setActivePage('dashboard')
      setSelectedProjectId(null)
    }
  }, [authReady, activeUser, route, setRoute, setActivePage, setSelectedProjectId, resetToken])

  useEffect(() => {
    if (route === '/app') {
      window.history.replaceState({}, '', '/app/dashboard')
      setRoute('/app/dashboard')
      setActivePage('dashboard')
    }
    if (route === '/app/competitive') {
      window.history.replaceState({}, '', '/app/competitive-coding')
      setRoute('/app/competitive-coding')
      setActivePage('competitive-coding')
    }
  }, [route, setRoute, setActivePage])

  const navigateRoute = (path) => {
    window.history.pushState({}, '', path)
    setRoute(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigateWorkspace = (page, projectId = null, documentId = null) => {
    navigate(page, { projectId, documentId })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const beginOnboarding = (user) => {
    setSessionUser(user)
    navigateRoute('/onboarding')
  }

  const completeOnboarding = (user, displayName) => {
    setSessionUser({
      uid: user.uid,
      displayName,
      email: user.email,
      providerData: user.providerData,
    })
    navigateRoute('/app/dashboard')
  }

  const userProfile = useMemo(() => {
    if (!activeUser) return null
    const fullName =
      activeUser.displayName?.trim() ||
      activeUser.email?.split('@')[0] ||
      'StarWaves user'
    const nameParts = fullName.split(/\s+/).filter(Boolean)
    return {
      uid: activeUser.uid,
      fullName,
      firstName: nameParts[0],
      initials: nameParts.slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
      email: activeUser.email ?? 'No email available',
      role: 'Member',
      roleLabel: activeUser.providerData?.some(
        ({ providerId }) => providerId === 'google.com',
      )
        ? 'Google account'
        : 'Email account',
    }
  }, [activeUser])

  const openProject = (project) => {
    navigateWorkspace('project-detail', project.id)
  }

  const requestCreation = (type) => {
    const destinations = { todo: 'todo', job: 'jobs', document: 'documents' }
    setCreationIntent({ type, requestId: Date.now() })
    navigateWorkspace(destinations[type])
  }

  const updateNotifications = (updater) => {
    setNotifications((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      next.forEach((notification) => {
        const previous = current.find((item) => item.id === notification.id)
        if (
          previous &&
          previous.unread !== notification.unread &&
          !notification.id.startsWith(CALENDAR_REMINDER_PREFIX)
        ) {
          updateNotification(notification.id, notification.unread).catch(
            (error) => console.error('Could not update notification:', error),
          )
        }
      })
      return next
    })
  }

  const handleSignOut = () => {
    clearAuthSession()
    setSessionUser(null)
    navigateRoute('/login')
  }

  const pages = {
    dashboard: (
      <DashboardPage
        tasks={tasks}
        projects={projects}
        jobs={jobs}
        documents={documents}
        contestSites={contestSites}
        hackathons={hackathons}
        notifications={notifications}
        calendarEventIndex={calendarEventIndex}
        onNavigate={navigateWorkspace}
        onCreate={requestCreation}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />
    ),
    eve: (
      <EvePage
        callCenter={callCenter}
        onNavigate={navigateWorkspace}
        onWorkspaceChanged={() => setWorkspaceRefreshKey((current) => current + 1)}
        chatResetKey={eveChatKey}
      />
    ),
    stats: (
      <StatsPage
        codingStats={codingStats}
        contestSites={contestSites}
        projects={projects}
        hackathons={hackathons}
        onNavigate={navigateWorkspace}
      />
    ),
    todo: <TodoPage tasks={tasks} setTasks={setTasks} createIntent={creationIntent} />,
    'competitive-coding': <CompetitiveCodingPage contestSites={contestSites} />,
    hackathons: (
      <HackathonsPage
        hackathons={hackathons}
        setHackathons={setHackathons}
        canLoadMore={pagination.hackathons.has_more}
        loadingMore={loadingMore}
        onLoadMore={() => loadMore('hackathons')}
        onOpenHackathon={(hackathonId) => navigate('hackathon-detail', { hackathonId })}
      />
    ),
    'hackathon-detail': selectedHackathon ? (
      <HackathonDetailPage
        hackathon={selectedHackathon}
        onBack={() => navigateWorkspace('hackathons')}
        onSave={(updated) =>
          setHackathons((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          )
        }
        onDelete={(deletedId) =>
          setHackathons((current) =>
            current.filter((item) => item.id !== deletedId),
          )
        }
      />
    ) : (
      <HackathonsPage
        hackathons={hackathons}
        setHackathons={setHackathons}
        canLoadMore={pagination.hackathons.has_more}
        loadingMore={loadingMore}
        onLoadMore={() => loadMore('hackathons')}
        onOpenHackathon={(hackathonId) => navigate('hackathon-detail', { hackathonId })}
      />
    ),
    projects: (
      <ProjectsPage
        projects={projects}
        setProjects={setProjects}
        onOpenProject={openProject}
        canLoadMore={pagination.projects.has_more}
        loadingMore={loadingMore}
        onLoadMore={() => loadMore('projects')}
      />
    ),
    jobs: (
      <JobsPage
        jobs={jobs}
        setJobs={setJobs}
        documents={documents}
        createIntent={creationIntent}
        canLoadMore={pagination.jobs.has_more}
        loadingMore={loadingMore}
        onLoadMore={() => loadMore('jobs')}
      />
    ),
    documents: (
      <DocumentsPage documents={documents} setDocuments={setDocuments} createIntent={creationIntent} onOpenDocument={(documentId) => navigate('document-opener', { documentId })} />
    ),
    'document-opener': (
      <DocumentOpenerPage
        document={selectedDocument}
        onBack={() => navigateWorkspace('documents')}
      />
    ),
    'project-detail': selectedProject ? (
      <ProjectDetailPage
        project={selectedProject}
        onBack={() => navigateWorkspace('projects')}
        onSave={(updatedProject) =>
          setProjects((current) =>
            current.map((project) =>
              project.id === updatedProject.id ? updatedProject : project,
            ),
          )
        }
      />
    ) : (
      <ProjectsPage
        projects={projects}
        setProjects={setProjects}
        onOpenProject={openProject}
      />
    ),
    calendar: (
      <CalendarPage
        eventsByDate={calendarEventIndex}
        googleCalendarEvents={googleCalendarEvents}
        importedIcsCalendars={importedIcsCalendars}
        setImportedIcsCalendars={setImportedIcsCalendars}
        importedIcsEvents={importedIcsEvents}
        setImportedIcsEvents={setImportedIcsEvents}
        onNavigate={navigateWorkspace}
      />
    ),
    mails: <MailsPage onNavigate={navigateWorkspace} />,
    chats: <ChatsPage onNavigate={navigateWorkspace} />,
    calls: <CallsPage callCenter={callCenter} user={userProfile} />,
    profile: (
      <ProfilePage
        user={userProfile}
        onProfileUpdated={(newName) =>
          setSessionUser((current) => ({
            ...(current || activeUser),
            displayName: newName,
          }))
        }
        onSignOut={handleSignOut}
      />
    ),
    themes: <ThemesPage />,
    setting: (
      <SettingPage
        user={userProfile}
        onNavigate={navigateWorkspace}
        onGoogleCalendarsChange={setGoogleCalendarEvents}
        onHackathonsChange={setHackathons}
        onContestSitesChange={setContestSites}
        importedIcsCalendars={importedIcsCalendars}
        setImportedIcsCalendars={setImportedIcsCalendars}
        importedIcsEvents={importedIcsEvents}
        setImportedIcsEvents={setImportedIcsEvents}
        onSignOut={handleSignOut}
      />
    ),
  }

  if (route === '/') {
    if (!authReady) return <WaveLoader />
    if (resetToken) {
      return publicRoute(<AuthPage mode="reset" resetToken={resetToken} onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />)
    }
    return publicRoute(<LandingPage user={activeUser} onNavigate={navigateRoute} />)
  }
  if (route === '/privacy') return publicRoute(<PrivacyPolicyPage onNavigate={navigateRoute} />)
  if (route === '/terms') return publicRoute(<TermsOfServicePage onNavigate={navigateRoute} />)
  if (route === '/login') {
    if (!authReady) return <WaveLoader />
    if (resetToken) {
      return publicRoute(<AuthPage mode="reset" resetToken={resetToken} onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />)
    }
    if (activeUser) {
      return <WaveLoader />
    }
    return publicRoute(<AuthPage mode="login" onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />)
  }
  if (route === '/signup') {
    if (!authReady) return <WaveLoader />
    if (resetToken) {
      return publicRoute(<AuthPage mode="reset" resetToken={resetToken} onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />)
    }
    if (activeUser) {
      return <WaveLoader />
    }
    return publicRoute(<AuthPage mode="signup" onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />)
  }
  if (route === '/forgot-password') {
    if (!authReady) return <WaveLoader />
    if (activeUser) {
      return <WaveLoader />
    }
    return publicRoute(<ForgotPasswordPage onNavigate={navigateRoute} />)
  }
  if (route === '/onboarding') {
    if (!authReady) return <WaveLoader />
    if (!activeUser) {
      return publicRoute(<AuthPage mode="login" onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />)
    }
    return publicRoute(<OnboardingPage user={activeUser} onComplete={completeOnboarding} />)
  }
  if (!authReady) {
    return <WaveLoader />
  }
  if (!activeUser) {
    return publicRoute(<AuthPage mode="login" onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />)
  }

  return (
    <>
      <AppLayout
        activePage={
          activePage === 'project-detail'
            ? 'projects'
            : activePage === 'hackathon-detail'
              ? 'hackathons'
              : activePage === 'document-opener'
                ? 'documents'
                : activePage
        }
        onNavigate={navigateWorkspace}
        notifications={notifications}
        setNotifications={updateNotifications}
        notificationsOpen={notificationsOpen}
        setNotificationsOpen={setNotificationsOpen}
        user={userProfile}
        notificationsCanLoadMore={pagination.notifications.has_more}
        notificationsLoading={loadingMore}
        onLoadMoreNotifications={() => loadMore('notifications')}
        onWorkspaceChanged={() => setWorkspaceRefreshKey((current) => current + 1)}
        onEveNewChat={() => setEveChatKey((current) => current + 1)}
        onSignOut={handleSignOut}
      >
        {pages[activePage] ?? pages.dashboard}
      </AppLayout>
      <IncomingCallOverlay callCenter={callCenter} myUid={userProfile?.uid} />
    </>
  )
}

export default App
