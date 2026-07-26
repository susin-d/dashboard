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
  const [sidebarProximityExpanded, setSidebarProximityExpanded] = useState(false)
  const contentRef = useRef(null)
  const isSidebarExpanded = sidebarExpanded || sidebarProximityExpanded

  useEffect(() => {
    localStorage.setItem('starwaves.sidebar-expanded', String(sidebarExpanded))
  }, [sidebarExpanded])

  useEffect(() => {
    contentRef.current?.focus({ preventScroll: true })
  }, [activePage])

  useEffect(() => {
    if (sidebarExpanded) {
      setSidebarProximityExpanded(false)
      return undefined
    }

    let frameId = null
    let latestClientX = null

    const updateProximity = () => {
      frameId = null
      if (latestClientX === null) return
      const expandedBoundary = activePage === 'mails' ? 470 : 280
      setSidebarProximityExpanded((expanded) =>
        expanded
          ? latestClientX <= expandedBoundary
          : latestClientX <= 96,
      )
    }

    const handlePointerMove = (event) => {
      if (window.innerWidth <= 768 || event.pointerType === 'touch') return
      latestClientX = event.clientX
      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateProximity)
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [activePage, sidebarExpanded])

  const toggleSidebarExpanded = () => {
    setSidebarExpanded(!isSidebarExpanded)
    setSidebarProximityExpanded(false)
  }

  return (
    <div className={`app-shell ${isSidebarExpanded ? 'sidebar-expanded' : ''}`}>
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
        isExpanded={isSidebarExpanded}
        isOpen={sidebarOpen}
        onToggleExpanded={toggleSidebarExpanded}
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
