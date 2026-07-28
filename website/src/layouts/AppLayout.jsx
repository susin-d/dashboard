import { useEffect, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { NetworkStatus } from '../components/NetworkStatus'
import { navigationItems } from '../config/navigation'
import '../App.css'

const MOBILE_NAV_BREAKPOINT = 900

export function AppLayout({
  activePage,
  children,
  onNavigate,
  notifications,
  setNotifications,
  notificationsOpen,
  setNotificationsOpen,
  user,
  notificationsCanLoadMore,
  notificationsLoading,
  onLoadMoreNotifications,
  onWorkspaceChanged,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(
    () => localStorage.getItem('starwaves.sidebar-expanded') !== 'false',
  )
  const contentRef = useRef(null)
  const activeItem = navigationItems.find(({ id }) => id === activePage)
  const isSidebarExpanded = sidebarExpanded

  useEffect(() => {
    contentRef.current?.focus({ preventScroll: true })
  }, [activePage])

  useEffect(() => {
    localStorage.setItem('starwaves.sidebar-expanded', String(sidebarExpanded))
  }, [sidebarExpanded])

  const toggleNavigation = () => {
    if (window.innerWidth <= MOBILE_NAV_BREAKPOINT) {
      setSidebarOpen(true)
      return
    }
    setSidebarExpanded((expanded) => !expanded)
  }

  return (
    <div className={`app-shell ${isSidebarExpanded ? 'sidebar-expanded' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <NetworkStatus />
      <Header
        onMenuOpen={toggleNavigation}
        navigationExpanded={isSidebarExpanded}
        onNavigate={onNavigate}
        notifications={notifications}
        setNotifications={setNotifications}
        notificationsOpen={notificationsOpen}
        setNotificationsOpen={setNotificationsOpen}
        user={user}
        notificationsCanLoadMore={notificationsCanLoadMore}
        notificationsLoading={notificationsLoading}
        onLoadMoreNotifications={onLoadMoreNotifications}
        onWorkspaceChanged={onWorkspaceChanged}
      />
      <Sidebar
        activePage={activePage}
        isExpanded={isSidebarExpanded}
        isOpen={sidebarOpen}
        onNavigate={onNavigate}
        onClose={() => setSidebarOpen(false)}
      />
      <main
        ref={contentRef}
        id="main-content"
        className={`content ${activePage === 'calendar' ? 'calendar-content' : ''}`}
        tabIndex={-1}
      >
        {activeItem && (
          <nav className="app-breadcrumbs" aria-label="Breadcrumb">
            <span>Workspace</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{activeItem.label}</span>
          </nav>
        )}
        {children}
      </main>
    </div>
  )
}
