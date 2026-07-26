import { useLayoutEffect, useRef, useState } from 'react'
import { navigationItems } from '../config/navigation'

export function Sidebar({
  activePage,
  isExpanded,
  isOpen,
  onClose,
  onNavigate,
}) {
  const sidebarRef = useRef(null)
  const itemRefs = useRef(new Map())
  const [indicatorStyle, setIndicatorStyle] = useState(null)
  const mainNavigation = navigationItems.filter(({ id }) => id !== 'setting')
  const settingItem = navigationItems.find(({ id }) => id === 'setting')
  const SettingIcon = settingItem?.icon

  useLayoutEffect(() => {
    const sidebar = sidebarRef.current
    const activeItem = itemRefs.current.get(activePage)

    if (!sidebar || !activeItem) return

    const updateIndicator = () => {
      const sidebarRect = sidebar.getBoundingClientRect()
      const itemRect = activeItem.getBoundingClientRect()

      setIndicatorStyle({
        height: itemRect.height,
        transform: `translateY(${itemRect.top - sidebarRect.top}px)`,
      })
    }

    updateIndicator()

    const resizeObserver = new ResizeObserver(updateIndicator)
    resizeObserver.observe(sidebar)
    window.addEventListener('resize', updateIndicator)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateIndicator)
    }
  }, [activePage, isExpanded, isOpen])

  const setItemRef = (id) => (node) => {
    if (node) itemRefs.current.set(id, node)
    else itemRefs.current.delete(id)
  }

  const handleNavigate = (page) => {
    onNavigate(page)
    onClose()
  }

  return (
    <>
      <aside
        ref={sidebarRef}
        className={`sidebar ${isExpanded ? 'expanded' : ''} ${isOpen ? 'open' : ''}`}
      >
        <span
          className={`sidebar-active-indicator ${indicatorStyle ? 'visible' : ''}`}
          style={indicatorStyle ?? undefined}
          aria-hidden="true"
        />
        <div className="sidebar-heading">
          <span>Workspace</span>
        </div>

        <nav aria-label="Main navigation">
          {mainNavigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              ref={setItemRef(id)}
              className={`nav-item ${activePage === id ? 'active' : ''}`}
              onClick={() => handleNavigate(id)}
              aria-current={activePage === id ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {settingItem && (
          <nav className="sidebar-bottom-nav" aria-label="Settings navigation">
            <button
              ref={setItemRef(settingItem.id)}
              className={`nav-item ${activePage === settingItem.id ? 'active' : ''}`}
              onClick={() => handleNavigate(settingItem.id)}
              aria-current={activePage === settingItem.id ? 'page' : undefined}
            >
              <SettingIcon size={18} />
              <span>{settingItem.label}</span>
            </button>
          </nav>
        )}
      </aside>

      {isOpen && (
        <button
          className="backdrop"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}
    </>
  )
}
