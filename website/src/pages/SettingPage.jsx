import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AccountSection } from './settings/AccountSection'
import { AiModelsSection } from './settings/AiModelsSection'
import { AppsSection } from './settings/AppsSection'
import { CodingSection } from './settings/CodingSection'
import { EveVoiceSection } from './settings/EveVoiceSection'
import { HackathonSourcesSection } from './settings/HackathonSourcesSection'
import { ProfileSection } from './settings/ProfileSection'
import { ThemeSection } from './settings/ThemeSection'

const SETTINGS_SECTIONS = [
  { id: 'settings-profile', href: '#settings-profile', label: 'Profile' },
  { id: 'settings-themes', href: '#settings-themes', label: 'Themes & Appearance' },
  { id: 'settings-apps', href: '#settings-apps', label: 'Integrations' },
  { id: 'settings-ai-models', href: '#settings-ai-models', label: 'AI Models' },
  { id: 'settings-coding', href: '#settings-coding', label: 'Coding profiles' },
  { id: 'settings-hackathons', href: '#settings-hackathons', label: 'Hackathons' },
  { id: 'settings-eve-voice', href: '#settings-eve-voice', label: 'Eve voice' },
  { id: 'settings-account', href: '#settings-account', label: 'Account & security' },
]

export function SettingPage({
  user,
  onNavigate,
  onGoogleCalendarsChange,
  onHackathonsChange,
  onContestSitesChange,
  importedIcsCalendars = [],
  setImportedIcsCalendars,
  setImportedIcsEvents,
  onSignOut,
}) {
  const navRef = useRef(null)
  const itemRefs = useRef(new Map())
  const [activeSection, setActiveSection] = useState('settings-profile')
  const [indicatorStyle, setIndicatorStyle] = useState(null)

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 180
      let current = SETTINGS_SECTIONS[0].id

      for (const section of SETTINGS_SECTIONS) {
        const el = document.getElementById(section.id)
        if (el && el.offsetTop <= scrollPos) {
          current = section.id
        }
      }
      setActiveSection(current)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useLayoutEffect(() => {
    const nav = navRef.current
    const activeItem = itemRefs.current.get(activeSection)

    if (!nav || !activeItem) return

    const updateIndicator = () => {
      const navRect = nav.getBoundingClientRect()
      const itemRect = activeItem.getBoundingClientRect()

      setIndicatorStyle({
        width: itemRect.width,
        height: itemRect.height,
        transform: `translateX(${itemRect.left - navRect.left + nav.scrollLeft}px)`,
      })
    }

    updateIndicator()

    const resizeObserver = new ResizeObserver(updateIndicator)
    resizeObserver.observe(nav)
    nav.addEventListener('scroll', updateIndicator, { passive: true })
    window.addEventListener('resize', updateIndicator)

    return () => {
      resizeObserver.disconnect()
      nav.removeEventListener('scroll', updateIndicator)
      window.removeEventListener('resize', updateIndicator)
    }
  }, [activeSection])

  const handleNavClick = (e, sectionId) => {
    e.preventDefault()
    setActiveSection(sectionId)
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(null, '', `#${sectionId}`)
    }
  }

  return (
    <section className="setting-page">
      <div className="page-heading">
        <div>
          <p>Account</p>
          <h1>Settings</h1>
        </div>
      </div>

      <nav ref={navRef} className="settings-section-nav" aria-label="Settings sections">
        <span
          className={`settings-nav-active-indicator ${indicatorStyle ? 'visible' : ''}`}
          style={indicatorStyle ?? undefined}
          aria-hidden="true"
        />
        {SETTINGS_SECTIONS.map((section) => (
          <a
            key={section.id}
            ref={(node) => {
              if (node) itemRefs.current.set(section.id, node)
              else itemRefs.current.delete(section.id)
            }}
            href={section.href}
            className={activeSection === section.id ? 'active' : ''}
            onClick={(e) => handleNavClick(e, section.id)}
          >
            {section.label}
          </a>
        ))}
      </nav>

      <ProfileSection user={user} />
      <ThemeSection onNavigate={onNavigate} />
      <AppsSection
        user={user}
        onGoogleCalendarsChange={onGoogleCalendarsChange}
        importedIcsCalendars={importedIcsCalendars}
        setImportedIcsCalendars={setImportedIcsCalendars}
        setImportedIcsEvents={setImportedIcsEvents}
      />
      <AiModelsSection />
      <CodingSection user={user} onContestSitesChange={onContestSitesChange} />
      <HackathonSourcesSection user={user} onHackathonsChange={onHackathonsChange} />
      <EveVoiceSection />
      <AccountSection user={user} onSignOut={onSignOut} />
    </section>
  )
}
