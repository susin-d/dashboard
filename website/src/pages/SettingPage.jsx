import { AccountSection } from './settings/AccountSection'
import { AiModelsSection } from './settings/AiModelsSection'
import { AppsSection } from './settings/AppsSection'
import { CodingSection } from './settings/CodingSection'
import { EveVoiceSection } from './settings/EveVoiceSection'
import { HackathonSourcesSection } from './settings/HackathonSourcesSection'
import { ProfileSection } from './settings/ProfileSection'
import { ThemeSection } from './settings/ThemeSection'

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
  return (
    <section className="setting-page">
      <div className="page-heading">
        <div>
          <p>Account</p>
          <h1>Settings</h1>
        </div>
      </div>

      <nav className="settings-section-nav" aria-label="Settings sections">
        <a href="#settings-profile">Profile</a>
        <a href="#settings-themes">Themes &amp; Appearance</a>
        <a href="#settings-apps">Integrations</a>
        <a href="#settings-ai-models">AI Models</a>
        <a href="#settings-coding">Coding profiles</a>
        <a href="#settings-eve-voice">Eve voice</a>
        <a href="#settings-account">Account &amp; security</a>
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
