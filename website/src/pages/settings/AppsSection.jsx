import { SectionHeading } from '../../components/ui'
import { CalendarSection } from './CalendarSection'
import { GithubSection } from './GithubSection'
import { GmailSection } from './GmailSection'
import { GoogleChatSection } from './GoogleChatSection'
import { IcsCalendarSection } from './IcsCalendarSection'
import { WorkspaceAppsSection } from './WorkspaceAppsSection'

export function AppsSection({
  user,
  onGoogleCalendarsChange,
  importedIcsCalendars,
  setImportedIcsCalendars,
  setImportedIcsEvents,
}) {
  return (
    <div className="setting-section" id="settings-apps">
      <SectionHeading
        title="Apps"
        description="Connect Google Workspace to use cloud files across StarWaves."
      />

      <div className="apps-settings-stack">
        <WorkspaceAppsSection />
        <CalendarSection user={user} onGoogleCalendarsChange={onGoogleCalendarsChange} />
        <IcsCalendarSection
          importedIcsCalendars={importedIcsCalendars}
          setImportedIcsCalendars={setImportedIcsCalendars}
          setImportedIcsEvents={setImportedIcsEvents}
        />
        <GmailSection user={user} />
        <GoogleChatSection user={user} />
        <GithubSection user={user} />
      </div>
    </div>
  )
}
