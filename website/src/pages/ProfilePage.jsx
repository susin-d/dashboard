import { ProfileCard } from '../components/ProfileCard'

export function ProfilePage({ user, onProfileUpdated }) {
  return (
    <section className="profile-page">
      <div className="page-heading">
        <div>
          <p>Account</p>
          <h1>Profile</h1>
        </div>
      </div>

      <div className="profile-page-content">
        <ProfileCard user={user} onProfileUpdated={onProfileUpdated} />
      </div>
    </section>
  )
}

