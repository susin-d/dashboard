import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from './layouts/AppLayout'
import { CalendarPage } from './pages/CalendarPage'
import { CompetitiveCodingPage } from './pages/CompetitiveCodingPage'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { HackathonsPage } from './pages/HackathonsPage'
import { JobsPage } from './pages/JobsPage'
import { MailsPage } from './pages/MailsPage'
import { ChatsPage } from './pages/ChatsPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SettingPage } from './pages/SettingPage'
import { StatsPage } from './pages/StatsPage'
import { TodoPage } from './pages/TodoPage'
import { LandingPage } from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { TermsOfServicePage } from './pages/TermsOfServicePage'
import { updateNotification } from './lib/workspaceApi'
import { CALENDAR_REMINDER_PREFIX } from './utils/calendarReminders'
import { useAuth, useRouter, useWorkspaceData } from './hooks'

function App() {
  const { currentUser, authReady } = useAuth()
  const [sessionUser, setSessionUser] = useState(null)
  const activeUser = currentUser || sessionUser

  const {
    route,
    setRoute,
    activePage,
    setActivePage,
    selectedProjectId,
    setSelectedProjectId,
    navigate,
  } = useRouter()

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
    hackathons,
    setHackathons,
    googleCalendarEvents,
    setGoogleCalendarEvents,
    importedIcsCalendars,
    setImportedIcsCalendars,
    importedIcsEvents,
    setImportedIcsEvents,
    calendarEventIndex,
  } = useWorkspaceData(activeUser, activePage)

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [creationIntent, setCreationIntent] = useState(null)

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )

  useEffect(() => {
    if (
      authReady &&
      activeUser &&
      (route === '/login' || route === '/signup')
    ) {
      window.history.replaceState({}, '', '/app/dashboard')
      setRoute('/app/dashboard')
      setActivePage('dashboard')
      setSelectedProjectId(null)
    }
  }, [authReady, activeUser, route, setRoute, setActivePage, setSelectedProjectId])

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

  const navigateWorkspace = (page, projectId = null) => {
    navigate(page, { projectId })
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
      />
    ),
    projects: (
      <ProjectsPage
        projects={projects}
        setProjects={setProjects}
        onOpenProject={openProject}
      />
    ),
    jobs: (
      <JobsPage
        jobs={jobs}
        setJobs={setJobs}
        documents={documents}
        createIntent={creationIntent}
      />
    ),
    documents: (
      <DocumentsPage documents={documents} setDocuments={setDocuments} createIntent={creationIntent} />
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
    profile: (
      <ProfilePage
        user={userProfile}
        onProfileUpdated={(newName) =>
          setSessionUser((current) => ({
            ...(current || activeUser),
            displayName: newName,
          }))
        }
      />
    ),
    setting: (
      <SettingPage
        user={userProfile}
        onGoogleCalendarsChange={setGoogleCalendarEvents}
        onHackathonsChange={setHackathons}
        onContestSitesChange={setContestSites}
        importedIcsCalendars={importedIcsCalendars}
        setImportedIcsCalendars={setImportedIcsCalendars}
        importedIcsEvents={importedIcsEvents}
        setImportedIcsEvents={setImportedIcsEvents}
      />
    ),
  }

  if (route === '/') return <LandingPage onNavigate={navigateRoute} />
  if (route === '/privacy') return <PrivacyPolicyPage onNavigate={navigateRoute} />
  if (route === '/terms') return <TermsOfServicePage onNavigate={navigateRoute} />
  if (route === '/login') {
    if (!authReady || activeUser) {
      return <div className="auth-loading">Loading StarWaves…</div>
    }
    return <AuthPage mode="login" onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />
  }
  if (route === '/signup') {
    if (!authReady || activeUser) {
      return <div className="auth-loading">Loading StarWaves…</div>
    }
    return <AuthPage mode="signup" onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />
  }
  if (route === '/onboarding') {
    if (!authReady) return <div className="auth-loading">Loading StarWaves…</div>
    if (!activeUser) {
      return <AuthPage mode="login" onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />
    }
    return <OnboardingPage user={activeUser} onComplete={completeOnboarding} />
  }
  if (!authReady) {
    return <div className="auth-loading">Loading StarWaves…</div>
  }
  if (!activeUser) {
    return <AuthPage mode="login" onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />
  }

  return (
    <AppLayout
      activePage={activePage === 'project-detail' ? 'projects' : activePage}
      onNavigate={navigateWorkspace}
      notifications={notifications}
      setNotifications={updateNotifications}
      notificationsOpen={notificationsOpen}
      setNotificationsOpen={setNotificationsOpen}
      user={userProfile}
    >
      {pages[activePage] ?? pages.dashboard}
    </AppLayout>
  )
}

export default App
