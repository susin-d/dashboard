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
  const [hoveredItem, setHoveredItem] = useState(null)
  const navigationGroups = Array.from(new Set(navigationItems.map(({ group }) => group)))

  useLayoutEffect(() => {
    const sidebar = sidebarRef.current
    const activeItem = itemRefs.current.get(activePage)

    if (!sidebar || !activeItem) return

    const updateIndicator = () => {
      const sidebarRect = sidebar.getBoundingClientRect()
      const itemRect = activeItem.getBoundingClientRect()

      setIndicatorStyle({
        height: itemRect.height,
        transform: `translateY(${itemRect.top - sidebarRect.top + sidebar.scrollTop}px)`,
      })
    }

    updateIndicator()

    const resizeObserver = new ResizeObserver(updateIndicator)
    resizeObserver.observe(sidebar)
    sidebar.addEventListener('scroll', updateIndicator, { passive: true })
    window.addEventListener('resize', updateIndicator)

    return () => {
      resizeObserver.disconnect()
      sidebar.removeEventListener('scroll', updateIndicator)
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
    setHoveredItem(null)
  }

  const handleMouseEnter = (e, label) => {
    if (!isExpanded && window.innerWidth > 900) {
      const rect = e.currentTarget.getBoundingClientRect()
      setHoveredItem({
        label,
        top: rect.top + rect.height / 2,
      })
    }
  }

  return (
    <>
      <aside
        ref={sidebarRef}
        className={`sidebar ${isExpanded ? 'expanded' : ''} ${isOpen ? 'open' : ''}`}
        onScroll={() => setHoveredItem(null)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <span
          className={`sidebar-active-indicator ${indicatorStyle ? 'visible' : ''}`}
          style={indicatorStyle ?? undefined}
          aria-hidden="true"
        />
        <nav aria-label="Main navigation">
          {navigationGroups.map((group) => (
            <div className="sidebar-nav-group" key={group}>
              <span className="sidebar-nav-group-label">{group}</span>
              {navigationItems
                .filter((item) => item.group === group)
                .map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    ref={setItemRef(id)}
                    className={`nav-item ${activePage === id ? 'active' : ''}`}
                    onClick={() => handleNavigate(id)}
                    onMouseEnter={(e) => handleMouseEnter(e, label)}
                    onMouseLeave={() => setHoveredItem(null)}
                    aria-current={activePage === id ? 'page' : undefined}
                    title={!isExpanded ? label : undefined}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
            </div>
          ))}
        </nav>
      </aside>

      {!isExpanded && hoveredItem && (
        <div
          className="sidebar-tooltip-pill"
          style={{ top: `${hoveredItem.top}px` }}
          role="tooltip"
        >
          {hoveredItem.label}
        </div>
      )}

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
