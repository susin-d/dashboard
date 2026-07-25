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
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (window.innerWidth <= 760 || event.pointerType === 'touch') return

      setSidebarExpanded((expanded) => {
        const expandedBoundary = 280

        if (!expanded && event.clientX <= 96) return true
        if (expanded && event.clientX > expandedBoundary) return false
        return expanded
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
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
