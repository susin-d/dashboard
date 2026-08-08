import { ProfileCard } from '../../components/ProfileCard'

export function ProfileSection({ user }) {
  return (
    <div className="setting-section" id="settings-profile">
      <div className="section-heading">
        <h2>Profile</h2>
        <p>Your personal information and account role.</p>
      </div>

      <ProfileCard user={user} />
    </div>
  )
}
