import { useEffect, useState } from 'react'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
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
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  useEffect(() => {
    let frameId = null
    let latestClientX = null

    const updateSidebarState = () => {
      frameId = null
      if (latestClientX === null) return

      const expandedBoundary = activePage === 'mails' ? 470 : 280
      setSidebarExpanded((expanded) => {
        const nextExpanded = expanded
          ? latestClientX <= expandedBoundary
          : latestClientX <= 96
        return nextExpanded === expanded ? expanded : nextExpanded
      })
    }

    const handlePointerMove = (event) => {
      if (window.innerWidth <= 760 || event.pointerType === 'touch') return

      latestClientX = event.clientX
      if (frameId === null) frameId = window.requestAnimationFrame(updateSidebarState)
    }

    window.addEventListener('pointermove', handlePointerMove)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [activePage])

  return (
    <div className={`app-shell ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
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
        onNavigate={onNavigate}
        onClose={() => setSidebarOpen(false)}
      />
      <main className={`content ${activePage === 'calendar' ? 'calendar-content' : ''}`}>
        {children}
      </main>
    </div>
  )
}
