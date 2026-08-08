import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  FolderKanban,
  Menu,
  Moon,
  Search,
  Settings,
  Trophy,
  Sun,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { navigationItems } from '../config/navigation'
import { deleteNotification, markAllNotificationsRead } from '../lib/workspaceApi'
import { CALENDAR_REMINDER_PREFIX } from '../utils/calendarReminders'
import { StarWavesLogo } from './StarWavesLogo'
import { EveAssistantModal } from './EveAssistantModal'

export function Header({
  onMenuOpen,
  navigationExpanded,
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [eveOpen, setEveOpen] = useState(false)
  const [darkTheme, setDarkTheme] = useState(
    () => localStorage.getItem('starwaves.theme') === 'dark',
  )
  const searchRef = useRef(null)
  const searchInputRef = useRef(null)
  const searchTargets = useMemo(
    () => [
      ...navigationItems,
      { id: 'profile', label: 'Profile', icon: UserRound },
    ],
    [],
  )
  const searchResults = searchTargets.filter(({ id, label }) => {
    const query = searchQuery.trim().toLowerCase()
    return !query || label.toLowerCase().includes(query) || id.includes(query)
  })
  const unreadCount = notifications.filter(
    (notification) => notification.unread,
  ).length
  const notificationIcons = {
    calendar: CalendarDays,
    contest: Trophy,
    project: FolderKanban,
    job: BriefcaseBusiness,
  }
  const notificationDestinations = {
    calendar: 'calendar',
    contest: 'competitive-coding',
    project: 'projects',
    job: 'jobs',
    hackathon: 'hackathons',
    task: 'todo',
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark-theme', darkTheme)
    localStorage.setItem('starwaves.theme', darkTheme ? 'dark' : 'light')
  }, [darkTheme])

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        searchInputRef.current?.focus()
      }
      if (event.key === 'Escape') setNotificationsOpen(false)
    }

    const handleOutsideClick = (event) => {
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false)
    }

    document.addEventListener('keydown', handleShortcut)
    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('keydown', handleShortcut)
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [setNotificationsOpen])

  const navigateFromMenu = (page) => {
    onNavigate(page)
    setProfileMenuOpen(false)
  }

  const navigateFromSearch = (page) => {
    onNavigate(page)
    setSearchOpen(false)
    setSearchQuery('')
    searchInputRef.current?.blur()
  }

  const openNotification = (notification) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, unread: false } : item,
      ),
    )
    setNotificationsOpen(false)

    const destination =
      notification.destination ?? notificationDestinations[notification.type]
    if (destination) {
      if (destination === 'calendar' && notification.targetId && notification.dateKey) {
        localStorage.setItem(
          'starwaves.calendar-focus',
          JSON.stringify({ targetId: notification.targetId, dateKey: notification.dateKey }),
        )
      }
      onNavigate(destination)
      if (notification.targetId) {
        window.setTimeout(() => {
          const target = document.querySelector(
            `[data-record-id="${CSS.escape(notification.targetId)}"]`,
          )
          if (!target) return
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
          target.classList.add('notification-target-highlight')
          window.setTimeout(() => target.classList.remove('notification-target-highlight'), 1600)
        }, 120)
      }
    }
  }

  const handleMarkAllRead = () => {
    markAllNotificationsRead().catch((err) => console.error(err))
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        unread: false,
      })),
    )
  }

  const handleDeleteNotification = (event, notificationId) => {
    event.stopPropagation()
    if (!notificationId.startsWith(CALENDAR_REMINDER_PREFIX)) {
      deleteNotification(notificationId).catch((err) => console.error(err))
    }
    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId),
    )
  }

  return (
    <>
      <header className="topbar">
      <div className="brand">
        <button
          className="icon-button menu-button"
          onClick={onMenuOpen}
          aria-label={navigationExpanded ? 'Collapse navigation' : 'Expand navigation'}
          aria-expanded={navigationExpanded}
          title={navigationExpanded ? 'Collapse navigation' : 'Expand navigation'}
        >
          <Menu size={20} />
        </button>
        <StarWavesLogo size={30} />
        <span>StarWaves</span>
      </div>

      <div className="header-actions">
        <div className="search-container" ref={searchRef}>
          <label className={`search ${searchOpen ? 'open' : ''}`}>
            <Search size={17} />
            <input
              ref={searchInputRef}
              aria-label="Go to page"
              placeholder="Go to page"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setSearchOpen(true)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setSearchOpen(false)
                  event.currentTarget.blur()
                }
                if (event.key === 'Enter' && searchResults[0]) {
                  navigateFromSearch(searchResults[0].id)
                }
              }}
            />
            <kbd>⌘ K</kbd>
          </label>

          {searchOpen && (
            <div className="search-results">
              <div className="search-results-heading">Go to page</div>
              {searchResults.length ? (
                searchResults.map(({ id, label, icon: Icon }, index) => (
                  <button
                    key={id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => navigateFromSearch(id)}
                  >
                    <span className="search-result-icon">
                      <Icon size={16} />
                    </span>
                    <span>{label}</span>
                    {index === 0 && searchQuery && <kbd>Enter</kbd>}
                  </button>
                ))
              ) : (
                <div className="search-empty">
                  <Search size={18} />
                  <span>No matching page</span>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          className="eve-button"
          type="button"
          onClick={() => setEveOpen(true)}
          aria-label="Open Eve AI assistant"
        >
          <Bot size={17} />
          <span>Eve</span>
        </button>
        <button
          className="icon-button theme-toggle"
          type="button"
          onClick={() => setDarkTheme((current) => !current)}
          aria-label={darkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-pressed={darkTheme}
          title={darkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {darkTheme ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="icon-button notification-button"
          type="button"
          aria-label={`${unreadCount} unread notifications`}
          aria-expanded={notificationsOpen}
          onClick={() => setNotificationsOpen((current) => !current)}
        >
          <Bell size={19} />
          {unreadCount > 0 && <span>{unreadCount}</span>}
        </button>
        <div className="profile-menu">
          <button
            className="profile-button"
            aria-label="Open profile menu"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((open) => !open)}
          >
            <span className="avatar">{user.initials}</span>
            <span className="profile-name">{user.firstName}</span>
            <ChevronDown
              className={profileMenuOpen ? 'chevron-open' : ''}
              size={15}
            />
          </button>

          {profileMenuOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-heading">
                <strong>{user.fullName}</strong>
                <span>{user.email}</span>
              </div>
              <div className="profile-dropdown-links">
                <button onClick={() => navigateFromMenu('profile')}>
                  <UserRound size={16} />
                  Profile
                </button>
                <button onClick={() => navigateFromMenu('setting')}>
                  <Settings size={16} />
                  Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </header>

      {notificationsOpen && createPortal(
        <div
          className="notification-backdrop"
          onMouseDown={() => setNotificationsOpen(false)}
          role="presentation"
        >
          <aside
            className="notification-panel"
            aria-label="Notifications"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="notification-panel-header">
              <div>
                <p>Inbox</p>
                <h2>Notifications</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setNotificationsOpen(false)}
                aria-label="Close notifications"
              >
                <X size={19} />
              </button>
            </div>

            <div className="notification-toolbar">
              <span>
                {unreadCount} unread
              </span>
              {notifications.length > 0 && (
                <button type="button" onClick={handleMarkAllRead}>
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="notification-empty">
                  <Bell size={24} aria-hidden="true" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const NotificationIcon =
                    notificationIcons[notification.type] ?? Bell

                  return (
                    <div className={`notification-item ${notification.unread ? 'unread' : ''}`} key={notification.id}>
                      <button type="button" className="notification-main" onClick={() => openNotification(notification)}>
                        <span className="notification-icon"><NotificationIcon size={17} /></span>
                        <span className="notification-copy">
                          <strong>{notification.title}</strong>
                          <span>{notification.message}</span>
                          <small>{notification.time}</small>
                        </span>
                        {notification.unread && <span className="notification-unread-dot" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNotification(e, notification.id)}
                        title="Dismiss notification"
                        className="notification-dismiss"
                        aria-label={`Dismiss ${notification.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
            {notificationsCanLoadMore && (
              <button className="secondary-button" type="button" onClick={onLoadMoreNotifications} disabled={notificationsLoading}>
                {notificationsLoading ? 'Loading…' : 'Load more notifications'}
              </button>
            )}
          </aside>
        </div>,
        document.body,
      )}
      <EveAssistantModal
        isOpen={eveOpen}
        onClose={() => setEveOpen(false)}
        onNavigate={onNavigate}
        onWorkspaceChanged={onWorkspaceChanged}
      />
    </>
  )
}
