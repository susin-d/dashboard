import "../styles/pages/settings-shell.css"
import "../styles/pages/settings-account-profile.css"
import { PageHeader } from '../components/ui'
import { ProfileCard } from '../components/ProfileCard'

export function ProfilePage({ user, onProfileUpdated, onSignOut }) {
  return (
    <section className="profile-page">
      <PageHeader eyebrow="You" title="Profile" />

      <div className="profile-page-content">
        <ProfileCard user={user} onProfileUpdated={onProfileUpdated} onSignOut={onSignOut} />
      </div>
    </section>
  )
}
