import { Suspense, useMemo, useRef, useState } from 'react'
import { buildAppPages } from './appPages'
import { AppLayout } from './layouts/AppLayout'
import { IncomingCallOverlay } from './components/calls/IncomingCallOverlay'
import {
  AuthPage,
  AvatarOverlayManager,
  AvatarOverlayPage,
  CustomPage,
  EveGlobalCompanionHost,
  ForgotPasswordPage,
  LandingPage,
  OnboardingPage,
  PrivacyPolicyPage,
  publicRoute,
  TermsOfServicePage,
} from './app/publicShell'
import { buildUserProfile, detectNativeApp, parseResetToken, resolveLayoutPage } from './app/appUtils'
import { useAccountDeepLinks, useAppTheme, useAppTitle, useAuthRedirects, useSessionEvents } from './app/useAppEffects'
import { updateNotification } from './lib/workspaceApi'
import { clearAuthSession } from './lib/authApi'
import { CALENDAR_REMINDER_PREFIX } from './utils/calendarReminders'
import { useAuth } from './hooks/useAuth'
import { useRouter } from './hooks/useRouter'
import { useWorkspaceData } from './hooks/useWorkspaceData'
import { useCallCenter } from './hooks/call/useCallCenter'
import { useSyncEvents } from './hooks/useSyncEvents'
import { WaveLoader } from './components/WaveLoader'
import { useDialogAccessibility } from './hooks/useDialogAccessibility'
import { CustomUIProvider } from './hooks/useCustomUI'
import { EveUiBanner } from './components/ui/EveUiBanner'
import { UpdateBanner } from './components/ui/UpdateBanner'
import { useAutoUpdater } from './hooks/useAutoUpdater'
import { EveAvatarProvider } from './components/eve/avatar/EveAvatarProvider'

function App() {
  useDialogAccessibility()
  const { currentUser, authReady } = useAuth()
  const [sessionUser, setSessionUser] = useState(null)
  const activeUser = currentUser || sessionUser
  const callCenter = useCallCenter({ user: activeUser })
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0)
  useSyncEvents({ user: activeUser, onInvalidate: () => setWorkspaceRefreshKey((k) => k + 1) })
  const isNativeApp = useMemo(detectNativeApp, [])
  const { update: appUpdate, dismiss: dismissAppUpdate } = useAutoUpdater()
  const resetToken = useMemo(parseResetToken, [])

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

  useAppTitle({ activePage, route, previousRouteRef })
  useAccountDeepLinks({ setSessionUser, setWorkspaceRefreshKey })
  useAppTheme()
  useAuthRedirects({ authReady, activeUser, resetToken, route, setRoute, setActivePage, setSelectedProjectId })
  useSessionEvents({ setSessionUser, setWorkspaceRefreshKey, clearAuthSession })

  const navigateRoute = (path) => {
    window.history.pushState({}, '', path)
    setRoute(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigateWorkspace = (page, projectId = null, documentId = null, hackathonId = null) => {
    const effectiveHackathonId = hackathonId || (page === 'hackathon-detail' ? projectId : null)
    const effectiveProjectId = page === 'hackathon-detail' ? null : projectId
    navigate(page, { projectId: effectiveProjectId, documentId, hackathonId: effectiveHackathonId })
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

  const userProfile = useMemo(() => buildUserProfile(activeUser), [activeUser])

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

  const pages = buildAppPages({
    activeUser,
    calendarEventIndex,
    callCenter,
    codingStats,
    contestSites,
    creationIntent,
    documents,
    setDocuments,
    eveChatKey,
    googleCalendarEvents,
    hackathons,
    setHackathons,
    importedIcsCalendars,
    setImportedIcsCalendars,
    importedIcsEvents,
    setImportedIcsEvents,
    jobs,
    setJobs,
    loadingMore,
    loadMore,
    navigate,
    navigateWorkspace,
    notifications,
    setNotificationsOpen,
    openProject,
    pagination,
    projects,
    setProjects,
    requestCreation,
    selectedDocument,
    selectedHackathon,
    selectedProject,
    selectedProjectId,
    setContestSites,
    setGoogleCalendarEvents,
    setSessionUser,
    setWorkspaceRefreshKey,
    tasks,
    setTasks,
    userProfile,
    handleSignOut,
  })

  if (route === '/') {
    if (!authReady) return <WaveLoader />
    if (resetToken) {
      return publicRoute(<AuthPage mode="reset" resetToken={resetToken} onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />)
    }
    if (isNativeApp && !activeUser) {
      return publicRoute(<AuthPage mode="login" onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />)
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
  if (route === '/app/avatar-overlay') {
    return (
      <EveAvatarProvider>
        <Suspense fallback={null}>
          <AvatarOverlayPage />
        </Suspense>
      </EveAvatarProvider>
    )
  }

  if (!authReady) {
    return <WaveLoader />
  }
  if (!activeUser) {
    return publicRoute(<AuthPage mode="login" onNavigate={navigateRoute} onAuthenticate={beginOnboarding} />)
  }

  return (
    <CustomUIProvider>
      <EveAvatarProvider>
        <AppLayout
          activePage={resolveLayoutPage(activePage)}
          onNavigate={navigateWorkspace}
          onCreate={requestCreation}
          callCenter={callCenter}
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
          workspaceData={{
            projects,
            jobs,
            documents,
            hackathons,
            tasks,
            contestSites,
          }}
        >
          <Suspense fallback={<WaveLoader />}>
            <div key={activePage} className="app-page-enter">
              {activePage.startsWith('custom-')
                ? (() => {
                  const slug = activePage.slice(7)
                  return <CustomPage slug={slug} />
                })()
                : (pages[activePage] ?? pages.dashboard)}
            </div>
          </Suspense>
          <IncomingCallOverlay callCenter={callCenter} myUid={userProfile?.uid} />
          <UpdateBanner update={appUpdate} onDismiss={dismissAppUpdate} />
          <EveUiBanner />
          <Suspense fallback={null}>
            <EveGlobalCompanionHost />
          </Suspense>
          <Suspense fallback={null}>
            <AvatarOverlayManager />
          </Suspense>
        </AppLayout>
      </EveAvatarProvider>
    </CustomUIProvider>
  )
}

export default App
