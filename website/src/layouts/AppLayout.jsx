import { useEffect, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { NetworkStatus } from '../components/NetworkStatus'
import '../App.css'

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
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(
    () => localStorage.getItem('starwaves.sidebar-expanded') === 'true',
  )
  const contentRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('starwaves.sidebar-expanded', String(sidebarExpanded))
  }, [sidebarExpanded])

  useEffect(() => {
    contentRef.current?.focus({ preventScroll: true })
  }, [activePage])

  return (
    <div className={`app-shell ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <NetworkStatus />
      <Header
        onMenuOpen={() => setSidebarOpen(true)}
        onNavigate={onNavigate}
        notifications={notifications}
        setNotifications={setNotifications}
        notificationsOpen={notificationsOpen}
        setNotificationsOpen={setNotificationsOpen}
        user={user}
        notificationsCanLoadMore={notificationsCanLoadMore}
        notificationsLoading={notificationsLoading}
        onLoadMoreNotifications={onLoadMoreNotifications}
      />
      <Sidebar
        activePage={activePage}
        isExpanded={sidebarExpanded}
        isOpen={sidebarOpen}
        onToggleExpanded={() => setSidebarExpanded((expanded) => !expanded)}
        onNavigate={onNavigate}
        onClose={() => setSidebarOpen(false)}
      />
      <main
        ref={contentRef}
        id="main-content"
        className={`content ${activePage === 'calendar' ? 'calendar-content' : ''}`}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  )
}
